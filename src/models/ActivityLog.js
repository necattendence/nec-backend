const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    student_name: String,
    student_rollNo: String,
    performed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performed_by_name: String,
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    description: String,
    ip_address: String,
    user_agent: String,
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ student_id: 1 });
activityLogSchema.index({ performed_by: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
