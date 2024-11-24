const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1024
  },
  icon: {
    type: String, // URL to the server icon
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }],
    nickname: {
      type: String,
      trim: true,
      maxlength: 32
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  defaultRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  inviteCode: {
    type: String,
    unique: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  settings: {
    defaultNotifications: {
      type: String,
      enum: ['all', 'mentions', 'none'],
      default: 'all'
    },
    explicitContentFilter: {
      type: String,
      enum: ['disabled', 'medium', 'high'],
      default: 'medium'
    },
    verificationLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'very_high'],
      default: 'low'
    }
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
serverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate unique invite code
serverSchema.pre('save', async function(next) {
  if (!this.inviteCode) {
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code;
    let isUnique = false;
    while (!isUnique) {
      code = generateCode();
      const existingServer = await mongoose.models.Server.findOne({ inviteCode: code });
      if (!existingServer) {
        isUnique = true;
      }
    }
    this.inviteCode = code;
  }
  next();
});

// Methods
serverSchema.methods.addMember = async function(userId) {
  if (!this.members.some(member => member.user.toString() === userId.toString())) {
    this.members.push({
      user: userId,
      roles: [this.defaultRole]
    });
    await this.save();
  }
  return this;
};

serverSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  await this.save();
  return this;
};

serverSchema.methods.updateMemberRoles = async function(userId, roleIds) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  if (member) {
    member.roles = roleIds;
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('Server', serverSchema);
