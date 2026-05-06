const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// @GET /api/dashboard - Global dashboard for current user
router.get('/', protect, async (req, res) => {
  try {
    // Get all projects user is a member of
    const projects = await Project.find({ 'members.user': req.user._id, isArchived: false });
    const projectIds = projects.map(p => p._id);

    // Get user's role per project
    const isAdminInAny = projects.some(p =>
      p.members.find(m => m.user.toString() === req.user._id.toString())?.role === 'Admin'
    );

    let taskQuery = { project: { $in: projectIds } };
    // Members only see their tasks
    const memberProjects = projects.filter(p =>
      p.members.find(m => m.user.toString() === req.user._id.toString())?.role === 'Member'
    );

    const now = new Date();

    const [totalTasks, todoTasks, inProgressTasks, doneTasks, overdueTasks] = await Promise.all([
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, status: 'To Do' }),
      Task.countDocuments({ ...taskQuery, status: 'In Progress' }),
      Task.countDocuments({ ...taskQuery, status: 'Done' }),
      Task.countDocuments({ ...taskQuery, dueDate: { $lt: now }, status: { $ne: 'Done' } })
    ]);

    // Tasks by priority
    const priorityStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Tasks per user (for admin)
    const tasksPerUser = await Task.aggregate([
      { $match: { project: { $in: projectIds }, assignedTo: { $exists: true } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { count: 1, 'user.name': 1, 'user.email': 1, 'user.avatar': 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Recent tasks
    const recentTasks = await Task.find(taskQuery)
      .populate('assignedTo', 'name avatar')
      .populate('project', 'name color')
      .sort({ updatedAt: -1 })
      .limit(5);

    // My tasks (assigned to me)
    const myTasks = await Task.find({
      ...taskQuery,
      assignedTo: req.user._id,
      status: { $ne: 'Done' }
    })
      .populate('project', 'name color')
      .sort({ dueDate: 1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalProjects: projects.length,
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        overdueTasks
      },
      priorityStats,
      tasksPerUser,
      recentTasks,
      myTasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/dashboard/project/:projectId - Project-level dashboard
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('members.user', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const member = project.members.find(m => m.user._id.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ success: false, message: 'Access denied' });

    const now = new Date();
    const pid = project._id;

    const [total, todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments({ project: pid }),
      Task.countDocuments({ project: pid, status: 'To Do' }),
      Task.countDocuments({ project: pid, status: 'In Progress' }),
      Task.countDocuments({ project: pid, status: 'Done' }),
      Task.countDocuments({ project: pid, dueDate: { $lt: now }, status: { $ne: 'Done' } })
    ]);

    const tasksPerUser = await Task.aggregate([
      { $match: { project: pid, assignedTo: { $exists: true } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { count: 1, done: 1, 'user.name': 1, 'user.avatar': 1 } }
    ]);

    res.json({
      success: true,
      project,
      stats: { total, todo, inProgress, done, overdue },
      tasksPerUser,
      userRole: member.role
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
