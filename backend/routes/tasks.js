const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// Helper to check project membership
const checkProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  const member = project.members.find(m => m.user.toString() === userId.toString());
  if (!member) return { error: 'Not a member of this project', status: 403 };
  return { project, role: member.role };
};

// @GET /api/tasks?project=id - Get tasks for a project
router.get('/', protect, async (req, res) => {
  try {
    const { project, status, priority, assignedTo, search } = req.query;

    if (!project) return res.status(400).json({ success: false, message: 'Project ID is required' });

    const access = await checkProjectAccess(project, req.user._id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    let query = { project };

    // Members only see tasks assigned to them
    if (access.role === 'Member') {
      query.assignedTo = req.user._id;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) query.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/tasks - Create task (Admin only)
router.post('/', protect, [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('project').notEmpty().withMessage('Project ID is required'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('status').optional().isIn(['To Do', 'In Progress', 'Done'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { title, description, project, priority, dueDate, assignedTo, tags } = req.body;

    const access = await checkProjectAccess(project, req.user._id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    if (access.role !== 'Admin') return res.status(403).json({ success: false, message: 'Only admins can create tasks' });

    const task = await Task.create({
      title,
      description,
      project,
      priority: priority || 'Medium',
      dueDate,
      assignedTo,
      tags,
      createdBy: req.user._id
    });

    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/tasks/:id - Get single task
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await checkProjectAccess(task.project, req.user._id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/tasks/:id - Update task
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await checkProjectAccess(task.project, req.user._id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const { title, description, status, priority, dueDate, assignedTo, tags } = req.body;

    // Members can only update status of their own tasks
    if (access.role === 'Member') {
      if (task.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update tasks assigned to you' });
      }
      task.status = status || task.status;
    } else {
      // Admins can update everything
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      if (tags) task.tags = tags;
    }

    await task.save();
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/tasks/:id - Delete task (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await checkProjectAccess(task.project, req.user._id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    if (access.role !== 'Admin') return res.status(403).json({ success: false, message: 'Only admins can delete tasks' });

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/tasks/:id/comments - Add comment
router.post('/:id/comments', protect, [
  body('text').trim().notEmpty().withMessage('Comment text is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await checkProjectAccess(task.project, req.user._id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    task.comments.push({ user: req.user._id, text: req.body.text });
    await task.save();
    await task.populate('comments.user', 'name email avatar');

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
