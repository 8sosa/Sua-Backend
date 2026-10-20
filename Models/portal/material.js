const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['Notes', 'Past questions', 'Worksheet', 'Video', 'Other'], default: 'Notes' },
    cohort: { type: String, required: true, trim: true },
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fileName: { type: String, required: true },
    mimeType: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', MaterialSchema);
