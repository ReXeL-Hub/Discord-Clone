const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  }
});

const messageSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'file', 'gif'],
    default: 'text'
  },
  attachments: [attachmentSchema],
  gifUrl: String,
  gifData: {
    width: Number,
    height: Number,
    title: String
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Add text search index
messageSchema.index({ content: 'text' });

// Add compound index for channelId and createdAt for efficient querying
messageSchema.index({ channelId: 1, createdAt: -1 });

// Virtual for formatted timestamp
messageSchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toLocaleString();
});

// Pre-save middleware to process mentions
messageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Extract mentions from content (e.g., @username)
    const mentionRegex = /@(\w+)/g;
    const mentions = this.content.match(mentionRegex) || [];
    // Store mentions for later processing
    this._mentions = mentions.map(m => m.substring(1));
  }
  next();
});

// Post-save middleware to handle notifications
messageSchema.post('save', async function(doc) {
  if (this._mentions && this._mentions.length > 0) {
    try {
      // Find mentioned users and create notifications
      const User = mongoose.model('User');
      const mentionedUsers = await User.find({
        username: { $in: this._mentions }
      });

      const Notification = mongoose.model('Notification');
      const notifications = mentionedUsers.map(user => ({
        userId: user._id,
        type: 'mention',
        message: `${this.author.username} mentioned you in #${this.channel.name}`,
        referenceId: this._id
      }));

      await Notification.insertMany(notifications);
    } catch (error) {
      console.error('Error processing mentions:', error);
    }
  }
});

// Method to check if user can edit message
messageSchema.methods.canEdit = function(userId) {
  return this.userId.toString() === userId.toString();
};

// Method to check if user can delete message
messageSchema.methods.canDelete = async function(userId) {
  // Message author can always delete their own messages
  if (this.userId.toString() === userId.toString()) {
    return true;
  }

  try {
    // Check if user has moderator permissions in the channel
    const Channel = mongoose.model('Channel');
    const channel = await Channel.findById(this.channelId);
    if (!channel) return false;

    const member = channel.members.find(m => m.userId.toString() === userId.toString());
    if (!member) return false;

    return member.role.permissions.includes('DELETE_MESSAGES');
  } catch (error) {
    console.error('Error checking delete permissions:', error);
    return false;
  }
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
