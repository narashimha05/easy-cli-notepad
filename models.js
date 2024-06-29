// models.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  plainPassword: { type: String }, // Optional
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  username: { type: String, required: true },
  sharedWith: { type: [String], default: [] },
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = { User, Task };