const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  position: {
    type: Number,
    default: 0
  },
  isCollapsed: {
    type: Boolean,
    default: false
  },
  permissions: [{
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    },
    view: { type: Boolean, default: true }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if user can view category
categorySchema.methods.canUserView = async function(userId) {
  const user = await mongoose.model('User').findById(userId).populate('roles');
  if (!user) return false;

  // Admin override
  if (user.roles.some(role => role.name === 'admin')) {
    return true;
  }

  // Check permissions for each role
  for (const userRole of user.roles) {
    const categoryPermission = this.permissions.find(
      p => p.role.toString() === userRole._id.toString()
    );
    if (categoryPermission && categoryPermission.view) {
      return true;
    }
  }

  return false;
};

module.exports = mongoose.model('Category', categorySchema);
