const mongoose = require('mongoose');

// A learner's hand-in for an assignment: an uploaded file, or "marked done" for work handed in on paper.
const SubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser', required: true },
    fileId: mongoose.Schema.Types.ObjectId,
    fileName: String,
    mimeType: String,
    size: Number,
  },
  { timestamps: true }
);
SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
