const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @GET /api/users/search?q=email - Search users by email (for adding to projects)
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 3 characters' });
    }

    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id }
    }).select('name email avatar').limit(10);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
