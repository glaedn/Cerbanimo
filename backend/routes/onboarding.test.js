const request = require('supertest');
const express = require('express');
const onboardingRoutes = require('./onboarding'); // Adjust path as necessary
const { generateProjectIdea, autoGenerateTasks } = require('../services/taskGenerator.js');
const pg = require('pg');

// Mock pg
const mockQuery = jest.fn();
const mockConnect = jest.fn(() => ({
  query: mockQuery,
  release: jest.fn(),
}));
jest.mock('pg', () => {
  const originalPg = jest.requireActual('pg');
  return {
    ...originalPg,
    Pool: jest.fn(() => ({
      connect: mockConnect,
      query: mockQuery, // For direct pool.query calls if any
    })),
  };
});

// Mock services
jest.mock('../services/taskGenerator.js', () => ({
  generateProjectIdea: jest.fn(),
  autoGenerateTasks: jest.fn(),
}));

// Mock multer (to prevent actual file writes and inspect req.file)
// This is a simplified multer mock. For more complex scenarios, you might need a more elaborate one.
const mockUpload = jest.fn((req, res, next) => {
  // Simulate file upload if a file is part of the test request
  if (req.file) { 
    // multer usually adds req.file if a file is uploaded.
    // For testing, we can manually set it in the test if we need to simulate a file.
  } else if (req.files) {
    // For multiple files
  }
  next();
});

jest.mock('multer', () => {
  const multer = jest.requireActual('multer');
  const diskStorage = jest.fn(options => multer.diskStorage(options)); // Mock diskStorage if its options are important
  const originalMulter = jest.fn(options => {
    // Return a middleware that calls our mockUpload
    // This allows us to inspect req.file or req.body for text fields
    return (req, res, next) => {
        // If using supertest.field for text fields and .attach for files,
        // supertest and busboy (used by multer) should handle populating req.body and req.file.
        // This mock just ensures that the multer setup in the route doesn't break.
        next();
    };
  });
  originalMulter.diskStorage = diskStorage;
  return originalMulter;
});


const app = express();
app.use(express.json()); // To parse JSON bodies
// Mock auth middleware
app.use((req, res, next) => {
  req.auth = { payload: { sub: 'test-auth0-id' } };
  next();
});
app.use('/api/onboarding', onboardingRoutes);


describe('POST /api/onboarding/initiate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations for successful flow
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Fetch User ID
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser' }] }) // Update Username/ProfilePic
      // Skills processing (can be multiple calls depending on skills array)
      .mockResolvedValue({ rows: [] }) // Default for skill/interest checks (empty means new)
      .mockResolvedValue({ rows: [{id: 101}]}) // Default for new skill/interest insertion
      .mockResolvedValueOnce({ rows: [] }) // Update users table with skills/interests
      .mockResolvedValueOnce({ rows: [{ id: 201 }] }) // Create Project
      // Task processing (can be multiple calls)
      .mockResolvedValue({ rows: [{id: 301}]}); // Default for task insertion

    generateProjectIdea.mockResolvedValue({ Name: 'Test Project', Description: 'A cool generated project.' });
    autoGenerateTasks.mockResolvedValue({
      projects: [{ id: 1, name: 'Test Project', description: 'A cool generated project.' }],
      tasks: [{ id: 1, name: 'Task 1', description: 'First task', skill_id: 101, dependencies: [], reward_tokens: 50 }]
    });
  });

  it('should successfully onboard a user with profile picture, new skills, and new interests', async () => {
    // Reset mocks for specific sequence
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Fetch User ID
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', profile_picture: 'uploads/test.jpg' }] }) // Update User
      .mockResolvedValueOnce({ rows: [] }) // Skill 'Coding' check - not found
      .mockResolvedValueOnce({ rows: [{ id: 101, name: 'Coding', unlocked_users: [] }] }) // Insert Skill 'Coding'
      .mockResolvedValueOnce({ rows: [] }) // Interest 'AI' check - not found
      .mockResolvedValueOnce({ rows: [{ id: 201, name: 'AI' }] }) // Insert Interest 'AI'
      .mockResolvedValueOnce({ rows: [] }) // Update user's skills/interests JSON
      .mockResolvedValueOnce({ rows: [{ id: 301 }] }) // Create Project
      .mockResolvedValueOnce({ rows: [{ id: 401 }] }) // Insert Task 1
      .mockResolvedValueOnce({ rows: [] }); // Update Task 1 dependencies (empty)
      
    generateProjectIdea.mockResolvedValue({ Name: 'AI Coder Project', Description: 'Project for AI and Coding.' });
    autoGenerateTasks.mockResolvedValue({
      projects: [{id:1, name: 'AI Coder Project'}],
      tasks: [{ id: 1, name: 'Setup AI model', description: '...', skill_id: 101, dependencies: [], reward_tokens: 100 }]
    });

    const response = await request(app)
      .post('/api/onboarding/initiate')
      .field('username', 'testuser')
      .field('skills', JSON.stringify([{ name: 'Coding' }, { name: 'Problem Solving' }, { name: 'Communication'}])) // 3 skills
      .field('interests', JSON.stringify([{ name: 'AI' }, { name: 'Dev' }, { name: 'Testing' }])) // 3 interests
      .attach('profilePicture', Buffer.from('fake image data'), 'test.jpg');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Onboarding completed successfully. Initial project created.');
    expect(response.body.user.username).toBe('testuser');
    expect(response.body.project.projectName).toBe('AI Coder Project');
    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    expect(generateProjectIdea).toHaveBeenCalledWith(expect.arrayContaining(['Coding']), expect.arrayContaining(['AI']));
    expect(autoGenerateTasks).toHaveBeenCalledWith('AI Coder Project', 'Project for AI and Coding.', [], 1);

    // Check user update query for profile_picture (example)
     const updateUserCall = mockQuery.mock.calls.find(call => call[0].startsWith('UPDATE users SET username = $1, profile_picture = $2'));
    expect(updateUserCall).toBeDefined();
    expect(updateUserCall[1]).toContain('testuser'); // username
    expect(updateUserCall[1][1]).toMatch(/uploads(\/|\\)\d+-test.jpg$/); // profile_picture path (regex for separator)
  });

  it('should successfully onboard a user without profile picture', async () => {
    mockQuery.mockReset();
     mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Fetch User ID
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'anotheruser'}] }) // Update User (no pic)
      // Simplified skills/interests - assume they exist
      .mockResolvedValueOnce({ rows: [{id: 101, name: 'Existing Skill', unlocked_users: []}] }) 
      .mockResolvedValueOnce({ rows: [{id: 201, name: 'Existing Interest'}] }) 
      .mockResolvedValueOnce({ rows: [] }) // Update user's skills/interests JSON
      .mockResolvedValueOnce({ rows: [{ id: 302 }] }) // Create Project
      .mockResolvedValueOnce({ rows: [{ id: 402 }] }) // Insert Task
      .mockResolvedValueOnce({ rows: [] });         // Update Task deps

    const response = await request(app)
      .post('/api/onboarding/initiate')
      .send({
        username: 'anotheruser',
        skills: JSON.stringify([{ name: 'Existing Skill' }, {name: 'Skill2'}, {name: 'Skill3'}]),
        interests: JSON.stringify([{ name: 'Existing Interest' }, {name: 'Interest2'}, {name: 'Interest3'}]),
      });

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe('anotheruser');
    const updateUserCall = mockQuery.mock.calls.find(call => call[0].startsWith('UPDATE users SET username = $1'));
    // Ensure profile_picture is NOT in this specific call's query string if no file uploaded
    expect(updateUserCall[0]).not.toContain('profile_picture =');
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('should return 404 if user not found', async () => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // User not found

    const response = await request(app)
      .post('/api/onboarding/initiate')
      .send({ username: 'ghost', skills: '[]', interests: '[]' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('User not found.');
    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
  });
  
  it('should handle project generation failure gracefully', async () => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Fetch User ID
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser'}] }) // Update User
      .mockResolvedValueOnce({ rows: [] }) 
      .mockResolvedValueOnce({ rows: [{id:101}]}) 
      .mockResolvedValueOnce({ rows: [] }) 
      .mockResolvedValueOnce({ rows: [{id:201}]}) 
      .mockResolvedValueOnce({ rows: [] }) // Update user's skills/interests
      // No more DB calls after this if generateProjectIdea fails and error is caught before DB ops for project
    
    generateProjectIdea.mockRejectedValue(new Error('LLM down'));

    const response = await request(app)
      .post('/api/onboarding/initiate')
      .send({ username: 'testuser', skills: JSON.stringify([{name: 'S1'},{name: 'S2'},{name: 'S3'}]), interests: JSON.stringify([{name: 'I1'},{name: 'I2'},{name: 'I3'}]) });
    
    expect(response.status).toBe(200); // As per current logic to commit user data
    expect(response.body.message).toContain('Onboarding completed successfully');
    expect(response.body.project).toBeNull(); // Or how your API indicates project creation failure
    expect(mockQuery).toHaveBeenCalledWith('COMMIT'); // User data should be committed
    expect(mockQuery).not.toHaveBeenCalledWith('ROLLBACK'); // Not rolled back if error is handled
  });

  // Note: Testing for missing username, skills < 3, interests < 3.
  // The current backend route doesn't have explicit validation for these BEFORE database operations.
  // It relies on frontend validation. If these are sent empty/invalid, it might lead to SQL errors or unexpected behavior.
  // For robust tests, either add backend validation or test the specific SQL errors that might occur.
  // For this example, we'll assume frontend handles these, and a general 500 might occur if bad data hits DB unprepared.

  it('should return 500 if database error occurs during user update', async () => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Fetch User ID
      .mockRejectedValueOnce(new Error('DB error on user update')); // Simulate DB error

    const response = await request(app)
      .post('/api/onboarding/initiate')
      .send({ username: 'testuser', skills: JSON.stringify([{name: 'S1'},{name: 'S2'},{name: 'S3'}]), interests: JSON.stringify([{name: 'I1'},{name: 'I2'},{name: 'I3'}]) });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Internal server error');
    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
  });

});
