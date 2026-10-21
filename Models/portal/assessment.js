const mongoose = require('mongoose');

// A scheduled test or exam that shows on learners' dashboards.
const AssessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    cohort: { type: String, required: true, trim: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    durationMins: { type: Number, required: true, min: 5, max: 300 },
    questions: { type: Number, required: true, min: 1, max: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assessment', AssessmentSchema);
