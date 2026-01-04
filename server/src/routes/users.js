import { Router } from 'express';
import bcrypt from 'bcrypt';

import { query, queryOne, pickPublicUser } from '../store/db.js';
import { requireAdmin, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  const rows = await query('SELECT id, username, role, created_at AS createdAt FROM users ORDER BY created_at DESC');
  res.json({ list: rows.map(pickPublicUser) });
});

router.put('/:id/username', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { username } = req.body || {};

  if (req.user.id !== id) {
    return res.status(403).json({ message: '只能修改自己的用户名' });
  }

  if (!username || username.length < 3 || username.length > 20) {
    return res.status(400).json({ message: '用户名长度必须在3-20位之间' });
  }

  const existingUser = await queryOne(
    'SELECT id FROM users WHERE username = :username AND id != :id LIMIT 1',
    { username, id }
  );
  if (existingUser) {
    return res.status(409).json({ message: '用户名已存在' });
  }

  const user = await queryOne('SELECT id, username, role, created_at AS createdAt FROM users WHERE id = :id LIMIT 1', { id });
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  await query('UPDATE users SET username = :username WHERE id = :id', { id, username });
  res.json({ item: pickPublicUser({ ...user, username }) });
});

router.put('/:id/password-self', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body || {};

  if (req.user.id !== id) {
    return res.status(403).json({ message: '只能修改自己的密码' });
  }

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: '旧密码和新密码不能为空' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: '新密码长度不能少于6位' });
  }

  const user = await queryOne(
    'SELECT id, username, password_hash, role, created_at FROM users WHERE id = :id LIMIT 1',
    { id }
  );
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isOldPasswordValid) {
    return res.status(401).json({ message: '旧密码错误' });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = :password_hash WHERE id = :id', { 
    id, 
    password_hash: newPasswordHash 
  });
  res.json({ ok: true });
});

router.put('/:id/role', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!role || !['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'invalid role' });
  }

  const existing = await queryOne('SELECT id, username, role, created_at AS createdAt FROM users WHERE id = :id LIMIT 1', { id });
  if (!existing) {
    return res.status(404).json({ message: 'not found' });
  }

  await query('UPDATE users SET role = :role WHERE id = :id', { id, role });
  res.json({ item: pickPublicUser({ ...existing, role }) });
});

router.put('/:id/password', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ message: 'password required' });
  }

  const existing = await queryOne('SELECT id FROM users WHERE id = :id LIMIT 1', { id });
  if (!existing) {
    return res.status(404).json({ message: 'not found' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash = :password_hash WHERE id = :id', { id, password_hash: passwordHash });
  res.json({ ok: true });
});

export default router;
