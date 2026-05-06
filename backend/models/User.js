const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: function () {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff&bold=true`;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Set default avatar after name is set
userSchema.pre('save', function (next) {
  if (!this.avatar || this.avatar === undefined) {
    this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff&bold=true`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
