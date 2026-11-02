const CollaborationRequest = require('../Models/collaborationRequest');
const { COLLAB_TYPES } = require('../Models/collaborationRequest');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const collaborationCtrl = {
  // Public: the website's collaboration form posts here.
  create: async (req, res) => {
    const body = req.body || {};
    // Honeypot: real visitors never fill this hidden field.
    if (str(body.botField)) return res.status(201).json({ message: 'Thank you. We will be in touch soon.' });

    const data = {
      organization: str(body.organization),
      organizationType: str(body.organizationType),
      website: str(body.website),
      country: str(body.country),
      contactName: str(body.contactName),
      email: str(body.email),
      phone: str(body.phone),
      collaborationType: str(body.collaborationType),
      message: str(body.message),
    };

    const missing = ['organization', 'contactName', 'email', 'collaborationType', 'message'].filter((k) => !data[k]);
    if (missing.length) return res.status(400).json({ message: 'Please fill in all the required fields.', fields: missing });
    if (!EMAIL_RE.test(data.email)) return res.status(400).json({ message: 'Please enter a valid email address.', fields: ['email'] });
    if (!COLLAB_TYPES.includes(data.collaborationType)) {
      return res.status(400).json({ message: 'Please choose what you would like to collaborate on.', fields: ['collaborationType'] });
    }

    try {
      await CollaborationRequest.create(data);
      res.status(201).json({ message: 'Thank you. We will be in touch soon.' });
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ message: 'Some details are too long or invalid.' });
      console.error('Error saving collaboration request:', error);
      res.status(500).json({ message: 'We could not send your request. Please try again.' });
    }
  },

  // Program Portal admins: review incoming requests.
  list: async (req, res) => {
    const items = await CollaborationRequest.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json(items);
  },

  updateStatus: async (req, res) => {
    const { status } = req.body || {};
    if (!['new', 'contacted', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    try {
      const item = await CollaborationRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!item) return res.status(404).json({ message: 'Request not found.' });
      res.json(item);
    } catch {
      res.status(404).json({ message: 'Request not found.' });
    }
  },
};

module.exports = collaborationCtrl;
