const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    from_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    to_student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    subject: String,
    body: {
      type: String,
      required: true,
    },
    message_type: {
      type: String,
      enum: ['note', 'announcement', 'assignment', 'alert'],
      default: 'note',
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_at: Date,
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Message', messageSchema);
