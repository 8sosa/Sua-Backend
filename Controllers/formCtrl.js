const Partner = require('../Models/partner');
const Volunteer = require('../Models/collab');

const formCtrl = {
  createPartner : async (req, res) => {
    try {
      const { name, email, company, message } = req.body;

      // Check if volunteer already exists (by email)
      const existingPartner = await Partner.findOne({ email });
      if (existingPartner) {
        return res.status(400).json({ message: 'A partner with this email already exists.' });
      }

      const newPartner = new Partner({ name, email, company, message });
      await newPartner.save();
      
      res.status(201).json({ message: 'Your submission has been received.' });
    } catch (error) {
      console.error('Error submitting partner form:', error);
      res.status(500).json({ message: 'Error submitting form', error });
    }
  },
  createVolunteer : async (req, res) => {
    try {
      const { name, email, phone, skills, availability, message } = req.body;
  
      // Check if volunteer already exists (by email)
      const existingVolunteer = await Volunteer.findOne({ email });
      if (existingVolunteer) {
        return res.status(400).json({ message: 'A volunteer with this email already exists.' });
      }
  
      const newVolunteer = new Volunteer({ name, email, phone, skills, availability, message });
      await newVolunteer.save();
  
      res.status(201).json({ message: 'Volunteer registration successful!', volunteer: newVolunteer });
    } catch (error) {
      console.error('Error creating volunteer:', error);
      res.status(500).json({ message: 'Error submitting volunteer form', error });
    }
  }
}

module.exports = formCtrl;