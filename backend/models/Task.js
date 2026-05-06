const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Done'],
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  dueDate: {
    type: Date
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comments: [commentSchema],
  tags: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

// Index for faster queries
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
