const mongoose = require('mongoose');

const studentRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rollNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    parentNo: {
      type: String,
      trim: true,
    },
    studentNo: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    batch: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approved_at: {
      type: Date,
    },
    source_student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
  },
  {
    timestamps: true,
  }
);

studentRegistrationSchema.index({ rollNo: 1, branch: 1, batch: 1, status: 1 });

module.exports = mongoose.model('StudentRegistration', studentRegistrationSchema);