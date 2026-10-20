const mongoose = require('mongoose');

// Turns thrown errors into JSON responses so every handler doesn't need its own try/catch.
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Some of the details are not valid.' });
    }
    if (error.code === 11000) return res.status(409).json({ message: 'That already exists.' });
    console.error('Portal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const fail = (status, message) => Object.assign(new Error(message), { status });

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const list = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

module.exports = { handle, fail, str, list, isId, isDate };
