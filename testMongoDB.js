require('dotenv').config();
const mongoose = require('mongoose');
const { Project } = require('./models/project');
const { User } = require('./models/user'); // Assuming User is a valid Mongoose model

const testMongoDB = async () => {
  try {
    // Connect to MongoDB
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('MongoDB Connected');

    // Create a user to act as the creator
    const user = await User.create({
      username: 'johndoe',
      email: 'johndoe@example.com',
      passwordHash: 'hashed_password_here',
    });

    // Create a project with the creator field
    const project = await Project.create({
      name: 'Sample Project',
      description: 'This is a test project.',
      creator: user._id, // Add the creator field
      tags: ['#test', '#example'],
    });

    console.log('MongoDB: Project created:', project);
  } catch (err) {
    console.error('MongoDB Test Error:', err);
  } finally {
    mongoose.disconnect();
  }
};

testMongoDB();
