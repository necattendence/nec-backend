const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
    },
    batch: {
      type: String,
    },
    branch: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    enrollment_date: {
      type: Date,
      default: Date.now,
    },
    import_id: mongoose.Schema.Types.ObjectId,
  },
  {
    timestamps: true,
  }
);

// Index for faster searches
studentSchema.index({ rollNo: 1, branch: 1, batch: 1 });

module.exports = mongoose.model('Student', studentSchema);
