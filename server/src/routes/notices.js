import { Router } from 'express';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../store/db.js';

const router = Router();

router.get('/', async (req, res) => {
  const list = await query(
    'SELECT id, title, content, type, is_urgent AS isUrgent, created_by AS createdBy, created_at AS createdAt FROM notices ORDER BY created_at DESC'
  );
  res.json({ list });
});

router.post('/', async (req, res) => {
  const { title, content, type, isUrgent } = req.body || {};
  if (!title) {
    return res.status(400).json({ message: 'title required' });
  }

  const notice = {
    id: nanoid(),
    title,
    content: content || '',
    type: type || 'policy',
    isUrgent: isUrgent || false,
    createdBy: req.user.username,
    createdAt: new Date()
  };

  await query(
    'INSERT INTO notices (id, title, content, type, is_urgent, created_by, created_at) VALUES (:id, :title, :content, :type, :is_urgent, :created_by, :created_at)',
    {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      type: notice.type,
      is_urgent: notice.isUrgent,
      created_by: notice.createdBy,
      created_at: notice.createdAt
    }
  );

  res.json({ item: notice });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, type, isUrgent } = req.body || {};

  const existing = await queryOne(
    'SELECT id, title, content, type, is_urgent AS isUrgent, created_by AS createdBy, created_at AS createdAt FROM notices WHERE id = :id LIMIT 1',
    { id }
  );
  if (!existing) {
    return res.status(404).json({ message: 'not found' });
  }

  const next = {
    id,
    title: title ?? existing.title,
    content: content ?? existing.content,
    type: type ?? existing.type,
    isUrgent: isUrgent !== undefined ? isUrgent : existing.isUrgent,
    createdBy: existing.createdBy,
    createdAt: existing.createdAt
  };

  await query(
    'UPDATE notices SET title = :title, content = :content, type = :type, is_urgent = :is_urgent WHERE id = :id',
    { id, title: next.title, content: next.content, type: next.type, is_urgent: next.isUrgent }
  );

  res.json({ item: next });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await query('DELETE FROM notices WHERE id = :id', { id });
  const affected = Number(result?.affectedRows || 0);
  if (affected === 0) {
    return res.status(404).json({ message: 'not found' });
  }
  res.json({ ok: true });
});

export default router;
