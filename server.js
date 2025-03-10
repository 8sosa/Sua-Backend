require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const redis = require('redis');
const crypto = require('crypto');
const connectDB = require('./config/db');
const cors = require('cors');
const sessionMiddleware = require('./Middleware/session');

const adminRoutes = require('./Routes/adminRoutes');
const productRoutes = require('./Routes/productRoutes');
const cartRoutes = require('./Routes/cartRoutes');
const checkoutRoutes = require('./Routes/checkoutRoutes');
const sessionRoute = require('./Routes/sessionRoute');

const app = express();
connectDB();

// Redis client setup
const client = redis.createClient();

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('Redis client connected.'));
client.on('ready', () => console.log('Redis client is ready.'));

(async () => {
    try {
        await client.connect();
        console.log('Redis client connected successfully.');
    } catch (error) {
        console.error('Error connecting to Redis:', error);
    }
})();

// Middleware to validate session and generate new session ID if expired or missing
app.use(async (req, res, next) => {
    if (!client.isOpen) {
        await client.connect(); // Reconnect if the client is closed
    }

    let cookies = req.headers.cookie;
    let sessionId = null;

    if (cookies) {
        const cookieArray = cookies.split(';').map(cookie => cookie.trim());
        const sessionCookie = cookieArray.find(cookie => cookie.startsWith('sessionId='));
        if (sessionCookie) {
            sessionId = sessionCookie.split('=')[1];
        }
    }

    if (!sessionId) {
        sessionId = crypto.randomUUID();
        const expiry = 2 * 60 * 60; // 2 hours in seconds

        try {
            await client.setEx(sessionId, expiry, JSON.stringify({ createdAt: Date.now() }));
            res.cookie('sessionId', sessionId, { httpOnly: true,secure: process.env.NODE_ENV === 'production', // Only secure in production
            sameSite: 'None', maxAge: expiry * 10000 });
            } catch (error) {
            console.error('Redis error:', error);
            return res.status(500).json({ message: 'Failed to create session.' });
        }
    }

    req.sessionId = sessionId; // Pass the session ID to subsequent middleware
    next();
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }));
// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/order/', checkoutRoutes);
app.use('/api/session', sessionRoute);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
