const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema(
  {
    file_name: {
      type: String,
      required: true,
    },
    imported_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    total_records: Number,
    created_count: Number,
    updated_count: Number,
    skipped_count: Number,
    errors: [
      {
        row: Number,
        error: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'partial'],
      default: 'pending',
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: Date,
    processing_time_ms: Number,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ImportLog', importLogSchema);
