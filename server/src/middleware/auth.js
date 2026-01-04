import jwt from 'jsonwebtoken';
import { queryOne } from '../store/db.js';

const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me';

export function signToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const token = header.slice('Bearer '.length);
    const decoded = jwt.verify(token, jwtSecret);

    const user = await queryOne(
      'SELECT id, username, role FROM users WHERE id = :id',
      { id: decoded.sub }
    );
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}
