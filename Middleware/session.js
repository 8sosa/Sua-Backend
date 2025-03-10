const sessionMiddleware = (req, res, next) => {
    // Ensure req.body exists
    if (!req.body) {
        req.body = {};
    }

    const sessionId = req.sessionId;  // Extract sessionId from cookies
    req.body.sessionId = sessionId;

    if (!sessionId) {
        return res.status(400).json({ message: 'Session ID is required' });
    }

    // Add sessionId to request object for easy access in controllers
    req.sessionId = sessionId;
    
    next();
}

module.exports = sessionMiddleware;
