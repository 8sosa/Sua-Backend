const Admin = require('../Models/admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const adminCtrl = {
    loginAdmin: async (req, res) => {
        try {
            const { username, password } = req.body;

            const admin = await Admin.findOne({ username });
            if (!admin) return res.status(404).json({ message: 'Admin not found' });

            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

            const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '3h' });
            res.json({ token, message: "login successful." });
        } catch (error) {
            res.status(500).json({ message: 'Server error' , error});
        }
    },
    registerAdmin: async (req, res) => {
        try {
            const { username, firstname, lastname, email, password } = req.body;

             // Check for missing fields
            if (!username || !firstname || !lastname || !email || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }
        
            // Check if admin already exists
            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Admin already exists' });
            }
        
            // Hash password and create admin
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
        
            const admin = new Admin({
                username,
                firstname,
                lastname,
                email,
                password: hashedPassword
            });
                
        await admin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
            } catch (error) {
                console.error('Error in /register:', error); // Log the error details
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        }
};

module.exports = adminCtrl;