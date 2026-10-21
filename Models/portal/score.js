const mongoose = require('mongoose');

// One learner's continuous assessment and exam marks for a subject in a term.
const ScoreSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser', required: true },
    cohort: { type: String, required: true },
    subject: { type: String, required: true },
    term: { type: String, required: true },
    ca1: { type: Number, min: 0, max: 20, default: null },
    ca2: { type: Number, min: 0, max: 20, default: null },
    exam: { type: Number, min: 0, max: 60, default: null },
    published: { type: Boolean, default: false },
    publishedAt: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser' },
  },
  { timestamps: true }
);
ScoreSchema.index({ student: 1, subject: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('Score', ScoreSchema);
