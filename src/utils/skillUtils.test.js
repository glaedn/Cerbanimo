// src/utils/skillUtils.test.js
import { processSkillDataForGalaxy, calculateExperienceNeeded } from './skillUtils';

describe('skillUtils', () => {
  describe('processSkillDataForGalaxy', () => {
    const mockUserId = 'user123';
    const baseSkills = [
      { id: 's1', name: 'Star Skill 1', parent_skill_id: null, unlocked_users: `[{"user_id":"${mockUserId}","level":5,"exp":100}]` },
      { id: 'p1', name: 'Planet Skill 1', parent_skill_id: 's1', unlocked_users: `[{"user_id":"${mockUserId}","level":3,"exp":50}]` },
      { id: 'm1', name: 'Moon Skill 1', parent_skill_id: 'p1', unlocked_users: `[{"user_id":"${mockUserId}","level":2,"exp":20}]` },
      { id: 'sat1', name: 'Satellite Skill 1', parent_skill_id: 'm1', unlocked_users: `[{"user_id":"${mockUserId}","level":1,"exp":10}]` },
      { id: 's2', name: 'Star Skill 2 (Unrelated)', parent_skill_id: null, unlocked_users: `[{"user_id":"anotherUser","level":1,"exp":10}]` },
      { id: 'p2', name: 'Planet Skill 2 (Child of s1, user no level)', parent_skill_id: 's1', unlocked_users: `[{"user_id":"anotherUser","level":1,"exp":10}]` },
    ];

    it('should correctly categorize skills including satellites', () => {
      const processed = processSkillDataForGalaxy(baseSkills, mockUserId);

      const star1 = processed.find(s => s.id === 's1');
      const planet1 = processed.find(s => s.id === 'p1');
      const moon1 = processed.find(s => s.id === 'm1');
      const satellite1 = processed.find(s => s.id === 'sat1');
      const planet2 = processed.find(s => s.id === 'p2');

      expect(star1?.category).toBe('star');
      expect(planet1?.category).toBe('planet');
      expect(moon1?.category).toBe('moon');
      expect(satellite1?.category).toBe('satellite');

      // p2 is not unlocked by mockUserId and is not a direct parent of an unlocked skill by mockUserId.
      // Based on current processSkillDataForGalaxy logic, it should not be included.
      const planet2Processed = processed.find(s => s.id === 'p2');
      expect(planet2Processed).toBeUndefined();
      // If planet2 were to be included structurally, the following would be tested:
      // expect(planet2?.category).toBe('planet');
      // expect(planet2?.userLevel).toBe(0);
      // expect(planet2?.isUnlockedByUser).toBe(false);
    });

    it('should correctly calculate levelForColor for stars and pass userLevel for dependencies', () => {
      const processed = processSkillDataForGalaxy(baseSkills, mockUserId);
      const star1 = processed.find(s => s.id === 's1');
      const planet1 = processed.find(s => s.id === 'p1');
      const moon1 = processed.find(s => s.id === 'm1');
      const satellite1 = processed.find(s => s.id === 'sat1');

      // Star levelForColor = star's own level + planet children levels + moon grandchildren levels.
      // s1 (5) + p1 (3) + m1 (2) = 10. Sat1 (1) is not included in star's sum based on current logic.
      expect(star1?.levelForColor).toBe(10);

      // Dependencies use their own userLevel for their levelForColor
      expect(planet1?.levelForColor).toBe(planet1?.userLevel);
      expect(moon1?.levelForColor).toBe(moon1?.userLevel);
      expect(satellite1?.levelForColor).toBe(satellite1?.userLevel);
    });

    it('includes structural parent skills not directly unlocked by user', () => {
      const skillsWithStructuralParent = [
        { id: 's3', name: 'Star Skill 3 (Not by User)', parent_skill_id: null, unlocked_users: `[{"user_id":"anotherUser","level":5,"exp":100}]` },
        { id: 'p3', name: 'Planet Skill 3 (Child of S3, by User)', parent_skill_id: 's3', unlocked_users: `[{"user_id":"${mockUserId}","level":3,"exp":50}]` },
      ];
      const processed = processSkillDataForGalaxy(skillsWithStructuralParent, mockUserId);

      const star3 = processed.find(s => s.id === 's3');
      const planet3 = processed.find(s => s.id === 'p3');

      expect(star3).toBeDefined();
      expect(star3?.category).toBe('star');
      expect(star3?.userLevel).toBe(0);
      expect(star3?.isUnlockedByUser).toBe(false);

      expect(planet3).toBeDefined();
      expect(planet3?.category).toBe('planet');
      expect(planet3?.userLevel).toBe(3);
      expect(planet3?.isUnlockedByUser).toBe(true);

      // Star3's levelForColor = sum of its children unlocked by user (p3 level 3)
      // + its own level IF it were unlocked by user (which is 0 here). So, just p3's level.
      expect(star3?.levelForColor).toBe(3);
    });
  });

  describe('calculateExperienceNeeded', () => {
    it('should return 0 for level 0', () => {
      expect(calculateExperienceNeeded(0)).toBe(0);
    });
    it('should calculate experience correctly for positive levels', () => {
      expect(calculateExperienceNeeded(1)).toBe(40);
      expect(calculateExperienceNeeded(2)).toBe(160);
      expect(calculateExperienceNeeded(10)).toBe(4000);
    });
    it('should return 0 for negative levels', () => {
      expect(calculateExperienceNeeded(-1)).toBe(0);
    });
  });
});
