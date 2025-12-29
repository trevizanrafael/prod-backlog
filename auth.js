// Authentication utilities for server
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Middleware to check permissions
async function checkPermission(permission) {
    return async (req, res, next) => {
        try {
            const db = require('./db/database');
            const result = await db.query(
                'SELECT r.permissions FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'User not found' });
            }

            const permissions = result.rows[0].permissions;
            if (!permissions[permission]) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        } catch (error) {
            res.status(500).json({ error: 'Permission check failed' });
        }
    };
}

module.exports = { authenticateToken, checkPermission, bcrypt, jwt, JWT_SECRET };
