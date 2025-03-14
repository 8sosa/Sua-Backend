// models/Volunteer.js
const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  skills: {
    type: [String],
    default: []
  },
  availability: {
    type: String,
    required: false
  },
  message: {
    type: String,
    required: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
