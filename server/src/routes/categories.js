import { Router } from 'express';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../store/db.js';

const router = Router();

router.get('/', async (req, res) => {
  const list = await query(
    'SELECT id, name, description, created_at AS createdAt FROM categories ORDER BY created_at DESC'
  );
  res.json({ list });
});

router.post('/', async (req, res) => {
  const { name, description } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: 'name required' });
  }

  const category = {
    id: nanoid(),
    name,
    description: description || '',
    createdAt: new Date()
  };

  await query(
    'INSERT INTO categories (id, name, description, created_at) VALUES (:id, :name, :description, :createdAt)',
    category
  );

  res.json({ item: category });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body || {};

  const existing = await queryOne(
    'SELECT id, name, description, created_at AS createdAt FROM categories WHERE id = :id LIMIT 1',
    { id }
  );
  if (!existing) {
    return res.status(404).json({ message: 'not found' });
  }

  const next = {
    id,
    name: name ?? existing.name,
    description: description ?? existing.description,
    createdAt: existing.createdAt
  };

  await query(
    'UPDATE categories SET name = :name, description = :description WHERE id = :id',
    { id, name: next.name, description: next.description }
  );

  res.json({ item: next });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await query('DELETE FROM categories WHERE id = :id', { id });
  const affected = Number(result?.affectedRows || 0);
  if (affected === 0) {
    return res.status(404).json({ message: 'not found' });
  }

  res.json({ ok: true });
});

export default router;
