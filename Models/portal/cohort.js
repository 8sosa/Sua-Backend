const mongoose = require('mongoose');

// A group of learners taught together, e.g. "Girls in Tech 2026".
const CohortSchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);

module.exports = mongoose.model('Cohort', CohortSchema);
