const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    detail: { type: String, trim: true, default: '' },
    subject: { type: String, required: true, trim: true },
    cohort: { type: String, required: true, trim: true },
    due: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', AssignmentSchema);
