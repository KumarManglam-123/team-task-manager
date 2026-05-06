const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { projectAdmin, projectMember } = require('../middleware/roles');

// @GET /api/projects - Get all projects for current user
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id,
      isArchived: false
    })
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    // Add task counts
    const projectsWithCounts = await Promise.all(projects.map(async (p) => {
      const taskCount = await Task.countDocuments({ project: p._id });
      const completedCount = await Task.countDocuments({ project: p._id, status: 'Done' });
      const obj = p.toObject();
      obj.taskCount = taskCount;
      obj.completedCount = completedCount;
      obj.userRole = p.members.find(m => m.user._id.toString() === req.user._id.toString())?.role;
      return obj;
    }));

    res.json({ success: true, projects: projectsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/projects - Create project
router.post('/', protect, [
  body('name').trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters'),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { name, description, color } = req.body;
    const project = await Project.create({
      name,
      description,
      color: color || '#6366f1',
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }]
    });

    await project.populate('members.user', 'name email avatar');
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/projects/:projectId - Get single project
router.get('/:projectId', protect, projectMember, async (req, res) => {
  try {
    await req.project.populate('members.user', 'name email avatar');
    await req.project.populate('createdBy', 'name email');
    const project = req.project.toObject();
    project.userRole = req.projectRole;
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/projects/:projectId - Update project (Admin only)
router.put('/:projectId', protect, projectAdmin, [
  body('name').optional().trim().isLength({ min: 3 })
], async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const updated = await Project.findByIdAndUpdate(
      req.params.projectId,
      { name, description, color },
      { new: true, runValidators: true }
    ).populate('members.user', 'name email avatar');

    res.json({ success: true, project: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/projects/:projectId - Delete project (Admin only)
router.delete('/:projectId', protect, projectAdmin, async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.projectId });
    await Project.findByIdAndDelete(req.params.projectId);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/projects/:projectId/members - Add member (Admin only)
router.post('/:projectId/members', protect, projectAdmin, async (req, res) => {
  try {
    const { email, role } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const project = req.project;
    const alreadyMember = project.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member' });

    project.members.push({ user: user._id, role: role || 'Member' });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/projects/:projectId/members/:userId - Remove member (Admin only)
router.delete('/:projectId/members/:userId', protect, projectAdmin, async (req, res) => {
  try {
    const project = req.project;
    const memberToRemove = project.members.find(m => m.user.toString() === req.params.userId);
    if (!memberToRemove) return res.status(404).json({ success: false, message: 'Member not found' });

    // Can't remove the last admin
    const admins = project.members.filter(m => m.role === 'Admin');
    if (memberToRemove.role === 'Admin' && admins.length === 1) {
      return res.status(400).json({ success: false, message: 'Cannot remove the last admin' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/projects/:projectId/members/:userId/role - Change member role
router.put('/:projectId/members/:userId/role', protect, projectAdmin, async (req, res) => {
  try {
    const project = req.project;
    const member = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    member.role = req.body.role;
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
