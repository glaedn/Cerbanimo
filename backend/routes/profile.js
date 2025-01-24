router.post('/', ensureAuthenticated, upload.single('profilePicture'), async (req, res) => {
  const { username, skills, interests } = req.body;
  const userId = req.user.userId; // Assume userId is attached to req.user
  const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
  const skillsPool = ['Project management', 'Time management', 'Leadership', 'Public speaking', 'Problem-solving', 'Critical thinking', 'Teamwork', 'Research', 'Data analysis', 'Programming', 'Writing', 'Creative writing', 'Technical writing', 'Design', 'Graphic design', 'Web development', 'UX/UI design', 'Digital marketing', 'SEO', 'Social media management', 'Email marketing', 'Event planning', 'Conflict resolution', 'Customer service', 'Sales', 'Negotiation', 'Marketing strategy', 'Branding', 'Photography', 'Videography', 'Film editing', 'Animation', '3D modeling', 'App development', 'Mobile development', 'Database management', 'Machine learning', 'Artificial intelligence', 'Networking', 'Cybersecurity', 'Cloud computing', 'Graphic design software', 'Microsoft Office Suite', 'Excel', 'PowerPoint', 'Photoshop', 'Illustrator', 'Final Cut Pro', 'AutoCAD', 'Sketch', 'Figma', 'InDesign', 'Video production', 'Audio production', 'Editing', 'Public relations', 'Foreign languages', 'Translation', 'Copywriting', 'Content creation', 'Blogging', 'Vlogging', 'Creative direction', 'Fashion design', 'Interior design', 'Product design', 'Furniture making', 'Carpentry', 'Gardening', 'Cooking', 'Baking', 'Bartending', 'Wine tasting', 'Mixology', 'Fitness training', 'Yoga instruction', 'Meditation', 'Life coaching', 'Financial planning', 'Investing', 'Accounting', 'Budgeting', 'Tax preparation', 'Grant writing', 'Real estate', 'Property management', 'Legal research', 'Compliance', 'Contract negotiation', 'Human resources', 'Recruiting', 'Interviewing', 'Employee training', 
    'Team building', 'Crisis management', 'Risk management', 'Customer relationship management (CRM)', 'Logistics', 'Supply chain management', 'Data visualization', 'Mathematics', 'Engineering', 'Construction management', 'Architecture', 'Geography', 'Urban planning', 'Ecology', 'Sustainability', 'Environmental science', 'Clothing design', 'Crafting', 'DIY projects', 'Sculpting', 'Painting', 'Drawing', 'Sketching', 'Printmaking', 'Pottery', 'Calligraphy', 'Woodworking', 'Metalworking', 'Jewelry making', 'Leatherworking', 'Photography editing', 'Pet care', 'Dog training', 'Animal behavior', 'Horseback riding', 'Swimming', 'Scuba diving', 'Mountain climbing', 'Rock climbing', 'Caving', 'Camping', 'Hiking', 'Cycling', 'Running', 'Skiing', 'Snowboarding', 'Surfing', 'Skateboarding', 'Flying drones', 'Astronomy', 'Space exploration', 'Antiquing', 'Collecting', 'Restoration', 'Beekeeping', 'Cheese making', 'Beer brewing', 'Coffee roasting', 'Candle making', 'Soap making', 'Self-defense', 'Martial arts', 'First aid', 'Emergency response', 'Mental health counseling', 'Therapy', 'Psychology', 'Social work', 'Coaching', 'Counseling', 'Social media strategy', 'Digital content creation', 'Podcasting', 'Voiceover work', 'Improv', 'Stand-up comedy', 'Scriptwriting', 'Game development', 'Virtual reality', 'Augmented reality', 'Board game design', 'Tabletop role-playing games', 'Magic tricks', 'Strategy games', 'Esports', 'Music composition', 'Instrumental music', 'Vocal performance', 'Singing', 'Songwriting', 'Music production', 'DJing', 'Sound engineering', 'Live performance', 
    'Concert promotion', 'Music theory', 'Music history', 'Music education', 'Choreography', 'Dance', 'Theater production', 'Acting', 'Stage management', 'Directing', 'Screenwriting', 'Film production', 'Cinematography', 'Film criticism', 'Film history', 'Film distribution', 'Script analysis'];
  const interestsPool = ['Film production', 'Sustainability', 'Fashion design', 'Technology', 'Fitness', 'Traveling', 'Cooking', 'Gardening', 'Photography', 'Music', 'Animals', 'Environment', 'Social justice', 'Mental health awareness', 'Sports', 'Literature', 'History', 'Art', 'Architecture', 'Design', 'Education', 'Politics', 'Philosophy', 'Psychology', 'Spirituality', 'Astronomy', 'Nature', 'Hiking', 'Camping', 'Climbing', 'Cycling', 'Running', 'Surfing', 'Dancing', 'Theater', 'Film making', 'Social media', 'Video games', 'Esports', 'Board games', 'Travel photography', 'Podcasting', 'Creative writing', 'Science fiction', 'Fantasy', 'Action movies', 'Romantic comedies', 'Documentaries', 'Vintage films', 'Anime', 'Comics', 'Graphic novels', 'Storytelling', 'Art history', 'Sketching', 'Painting', 'Digital art', 'Crafting', 'DIY projects', 'Jewelry making', 'Woodworking', 'Pottery', 'Interior design', 'Product design', 'Sculpture', 'Literary analysis', 'Public speaking', 'Entrepreneurship', 'Innovation', 'Networking', 'Business development', 'Marketing', 'Branding', 'Startups', 'Tech innovations', 'E-commerce', 'Sustainable fashion', 'Food sustainability', 'Animal rights', 'Social entrepreneurship', 'Cryptocurrency', 'Investing', 'Finance', 'Economics', 'Travel blogging', 'Film criticism', 'Film theory', 'Environmental activism', 'Conservation', 'Wildlife protection', 'Zero waste', 'Veganism', 'Health and wellness', 'Cooking tutorials', 'Wine tasting', 'Craft beer', 'Coffee brewing', 'Beer brewing', 'Cheese making', 'Candle making', 'Soap making', 'Self-care', 
    'Mindfulness', 'Yoga', 'Meditation', 'Physical fitness', 'Strength training', 'Cardio', 'Running', 'Swimming', 'Cycling', 'Trekking', 'Technology trends', 'Artificial intelligence', 'Space exploration', 'Quantum computing', 'Robotics', 'Smart homes', 'Renewable energy', 'Electric vehicles', 'Smartphones', 'Drones', 'Virtual reality', 'Augmented reality', 'Gaming culture', 'Esports tournaments', 'Cosplay', 'Anime conventions', 'Board game nights', 'Tabletop role-playing games', 'Podcasting', 'Storytelling', 'Social media strategy', 'Graphic design', 'Photography', 'Interior decorating', 'Pet care', 'Animal behavior', 'Sustainable fashion', 'Vintage collecting', 'Restoration projects', 'Home improvement', 'Antiquing', 'Sports cars', 'Motorcycling', 'Sailing', 'Flying', 'Public relations', 'Personal finance', 'Self-improvement', 'Personal development', 'Self-motivation', 'Time management', 'Life coaching', 'Event planning', 'Public speaking', 'Motivational speaking', 'Charity work', 'Volunteering', 'Nonprofit organizations', 'Community service', 'Political activism', 'Human rights', 'Racial equality', 'LGBTQ+ advocacy', 'Gender equality', 'Climate change', 'Environmentalism', 'Peace studies', 'Cultural exchange', 'History of art', 'Music theory', 'Music history', 'Choreography', 'Dance', 'Contemporary dance', 'Classical music', 'Jazz music', 'Pop music', 'Rock music', 'Hip-hop', 'Electronic music', 'Music composition', 'Songwriting', 'Instrumental music', 'Vocal performance', 'Music education', 'Music production', 'DJing', 'Sound engineering', 'Concert promotion', 
    'Live performance', 'Festival planning', 'Event coordination', 'Film festivals', 'Documentary making', 'Indie films', 'TV production', 'Film festivals', 'Theater acting', 'Stage design', 'Costume design', 'Screenwriting', 'Directing', 'Film editing', 'Cinematography', 'Script analysis', 'Creative direction', 'Public relations', 'Digital marketing', 'Crisis management'];
  
    router.get('/options', (req, res) => {
      res.json({ skillsPool, interestsPool });
    });

  try {
    const query = `
      UPDATE users
      SET 
        username = $1,
        skills = $2,
        interests = $3,
        profile_picture = COALESCE($4, profile_picture)
      WHERE id = $5
      RETURNING *;
    `;
    const values = [
      username,
      JSON.parse(skills),
      JSON.parse(interests),
      profilePicture,
      userId,
    ];
    const result = await pool.query(query, values);

    res.status(200).json({ message: 'Profile updated successfully', profile: result.rows[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});
