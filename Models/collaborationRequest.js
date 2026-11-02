const mongoose = require('mongoose');

// A request sent from the website's "Contact us to collaborate" form.
const COLLAB_TYPES = [
  'Sponsorship',
  'Mentor for the mentorship program',
  'Period Bank / No Girl Left Unprepared',
  'Joint event or outreach',
  'Business venture',
  'Other',
];

const collaborationRequestSchema = new mongoose.Schema(
  {
    organization: { type: String, required: true, trim: true, maxlength: 200 },
    organizationType: { type: String, trim: true, maxlength: 100 },
    website: { type: String, trim: true, maxlength: 300 },
    country: { type: String, trim: true, maxlength: 100 },
    contactName: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 50 },
    collaborationType: { type: String, enum: COLLAB_TYPES, required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('CollaborationRequest', collaborationRequestSchema);
module.exports.COLLAB_TYPES = COLLAB_TYPES;
