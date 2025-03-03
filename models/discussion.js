const mongoose = require('mongoose');

// Discussion schema
const discussionSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  author: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Export the model
const Discussion = mongoose.model('Discussion', discussionSchema);
module.exports = Discussion;
