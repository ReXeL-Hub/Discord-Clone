const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  permissions: {
    view: { type: Boolean, default: true },
    send: { type: Boolean, default: true },
    embed: { type: Boolean, default: true },
    upload: { type: Boolean, default: true },
    pin: { type: Boolean, default: false },
    manage: { type: Boolean, default: false }
  }
});

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'announcement'],
    default: 'text'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  permissions: [permissionSchema],
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  position: {
    type: Number,
    default: 0
  },
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
channelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate invite code for private channels
channelSchema.pre('save', function(next) {
  if (this.isPrivate && !this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

// Method to check user permissions
channelSchema.methods.getUserPermissions = async function(userId) {
  const user = await mongoose.model('User').findById(userId).populate('roles');
  if (!user) return null;

  // Admin override
  if (user.roles.some(role => role.name === 'admin')) {
    return {
      view: true,
      send: true,
      embed: true,
      upload: true,
      pin: true,
      manage: true
    };
  }

  // Combine permissions from all user roles
  const userPermissions = {
    view: false,
    send: false,
    embed: false,
    upload: false,
    pin: false,
    manage: false
  };

  for (const userRole of user.roles) {
    const channelPermission = this.permissions.find(
      p => p.role.toString() === userRole._id.toString()
    );
    if (channelPermission) {
      Object.keys(userPermissions).forEach(perm => {
        userPermissions[perm] = userPermissions[perm] || channelPermission.permissions[perm];
      });
    }
  }

  return userPermissions;
};

// Method to add pinned message
channelSchema.methods.pinMessage = async function(messageId) {
  if (!this.pinnedMessages.includes(messageId)) {
    this.pinnedMessages.push(messageId);
    await this.save();
  }
  return this;
};

// Method to remove pinned message
channelSchema.methods.unpinMessage = async function(messageId) {
  this.pinnedMessages = this.pinnedMessages.filter(
    id => id.toString() !== messageId.toString()
  );
  await this.save();
  return this;
};

module.exports = mongoose.model('Channel', channelSchema);
