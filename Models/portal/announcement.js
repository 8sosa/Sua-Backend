const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true, default: '' },
    // Empty means everyone in the portal.
    cohort: { type: String, trim: true, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', AnnouncementSchema);
