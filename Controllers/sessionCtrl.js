const Redis = require('ioredis');
const crypto = require('crypto');

// Initialize Redis client
const client = new Redis({
    host: 'localhost', // your Redis server address
    port: 6379,        // your Redis server port
    // Optional: add password or other configuration here
});

const sessionCtrl = {
    getSessionId: async (req, res) => {
        try {
            const sessionId = crypto.randomUUID(); // Generate unique session ID
            const expiry = 2 * 60 * 60; // 2 hours in seconds
            console.log(sessionId)
    
            // Store the session ID in Redis
            await client.set(sessionId, JSON.stringify({ createdAt: Date.now() }), 'EX', expiry);
            console.log('session id', sessionId);
            // Send session ID as a secure cookie
            res.cookie('sessionId', sessionId, { httpOnly: true,secure: process.env.NODE_ENV === 'production', // Only secure in production
            sameSite: 'None', maxAge: expiry * 10000 });
            res.status(200).json({ sessionId, message: 'Session created successfully.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to create session.' });
        }
    }
}

module.exports = sessionCtrl;