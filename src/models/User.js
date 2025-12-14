const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    full_name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher'],
      default: 'teacher',
    },
    phone: String,
    department: String,
    is_active: {
      type: Boolean,
      default: true,
    },
    is_approved: {
      type: Boolean,
      default: false,
    },
    approval_requested_at: Date,
    approved_by: mongoose.Schema.Types.ObjectId,
    approved_at: Date,
    rejection_reason: String,
    rejected_by: mongoose.Schema.Types.ObjectId,
    rejected_at: Date,
    last_login: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
