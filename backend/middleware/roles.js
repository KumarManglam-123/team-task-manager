const Project = require('../models/Project');

// Check if user is a member of the project
const projectMember = async (req, res, next) => {
  const project = await Project.findById(req.params.projectId || req.body.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const member = project.members.find(m => m.user.toString() === req.user._id.toString());
  if (!member) {
    return res.status(403).json({ success: false, message: 'You are not a member of this project' });
  }

  req.project = project;
  req.projectRole = member.role;
  next();
};

// Check if user is admin of the project
const projectAdmin = async (req, res, next) => {
  const project = await Project.findById(req.params.projectId || req.body.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const member = project.members.find(m => m.user.toString() === req.user._id.toString());
  if (!member || member.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  req.project = project;
  req.projectRole = 'Admin';
  next();
};

module.exports = { projectMember, projectAdmin };
