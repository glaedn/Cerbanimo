require('dotenv').config();
const Project = require('./models/project');
const mongoose = require('mongoose');
console.log('MongoDB URL:', process.env.MONGODB_URL);
console.log('createUserTable:', typeof createUserTable);
console.log('createProjectTable:', typeof createProjectTable);
console.log('createTaskTable:', typeof createTaskTable);
console.log('Project Model:', typeof Project);

const testMongoDB = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB Connected');
    (async () => {
        try {
          const project = await Project.create({
            name: 'Sample Project',
            description: 'This is a test project.',
            tags: ['#test', '#example'],
          });
          console.log('MongoDB: Project created:', project);
        } catch (err) {
          console.error('MongoDB: Error creating project:', err);
        }
      })();
    // Create a project
    const project = await Project.create({
      name: 'Project A',
      description: 'A sample project',
      tags: ['#tech', '#collaboration'],
    });
    console.log('Inserted Project:', project);
    console.log('Project:', Project);
    // Create a task associated with the project
    //const task = await Task.create({
    //  name: 'Task 1',
    //  description: 'A sample task',
    //  projectId: project._id,
    //});
    //console.log('Inserted Task:', task);

    // Add the task to the project
    //project.taskGroups.push(task._id);
    //await project.save();
    //console.log('Updated Project with Task:', project);
  } catch (err) {
    console.error('MongoDB Test Error:', err);
  } finally {
    mongoose.disconnect();
  }
};

testMongoDB();
