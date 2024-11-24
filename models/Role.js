const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: '#99AAB5'
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  permissions: {
    administrator: { type: Boolean, default: false },
    manageServer: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
    manageChannels: { type: Boolean, default: false },
    kickMembers: { type: Boolean, default: false },
    banMembers: { type: Boolean, default: false },
    createInvite: { type: Boolean, default: true },
    changeNickname: { type: Boolean, default: true },
    manageNicknames: { type: Boolean, default: false },
    manageEmojis: { type: Boolean, default: false },
    viewAuditLog: { type: Boolean, default: false },
    viewServer: { type: Boolean, default: true },
    sendMessages: { type: Boolean, default: true },
    embedLinks: { type: Boolean, default: true },
    attachFiles: { type: Boolean, default: true },
    addReactions: { type: Boolean, default: true },
    useExternalEmojis: { type: Boolean, default: true },
    mentionEveryone: { type: Boolean, default: false },
    manageMessages: { type: Boolean, default: false },
    readMessageHistory: { type: Boolean, default: true },
    muteMembers: { type: Boolean, default: false },
    deafenMembers: { type: Boolean, default: false },
    moveMembers: { type: Boolean, default: false }
  },
  position: {
    type: Number,
    default: 0
  },
  mentionable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to check if role has permission
roleSchema.methods.hasPermission = function(permission) {
  return this.permissions.administrator || this.permissions[permission];
};

// Method to grant permission
roleSchema.methods.grantPermission = async function(permission) {
  if (this.permissions.hasOwnProperty(permission)) {
    this.permissions[permission] = true;
    await this.save();
  }
  return this;
};

// Method to revoke permission
roleSchema.methods.revokePermission = async function(permission) {
  if (this.permissions.hasOwnProperty(permission)) {
    this.permissions[permission] = false;
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('Role', roleSchema);
