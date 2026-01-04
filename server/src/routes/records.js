import { Router } from 'express';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../store/db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { userId } = req.query;

  const where = [];
  const params = {};
  if (userId) {
    where.push('user_id = :userId');
    params.userId = String(userId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const list = await query(
    `SELECT id, user_id AS userId, item_name AS itemName, category_id AS categoryId, weight_kg AS weightKg, location, created_at AS createdAt
     FROM records ${whereSql}
     ORDER BY created_at DESC`,
    params
  );

  res.json({ list });
});

router.post('/', async (req, res) => {
  const { itemName, categoryId, weightKg, location } = req.body || {};
  if (!itemName || !categoryId) {
    return res.status(400).json({ message: 'itemName and categoryId required' });
  }

  const category = await queryOne('SELECT id FROM categories WHERE id = :id LIMIT 1', { id: categoryId });
  if (!category) {
    return res.status(400).json({ message: 'invalid categoryId' });
  }

  const record = {
    id: nanoid(),
    userId: req.user.id,
    itemName,
    categoryId,
    weightKg: typeof weightKg === 'number' ? weightKg : (weightKg ? Number(weightKg) : 0),
    location: location || '',
    createdAt: new Date()
  };

  await query(
    'INSERT INTO records (id, user_id, item_name, category_id, weight_kg, location, created_at) VALUES (:id, :user_id, :item_name, :category_id, :weight_kg, :location, :created_at)',
    {
      id: record.id,
      user_id: record.userId,
      item_name: record.itemName,
      category_id: record.categoryId,
      weight_kg: record.weightKg,
      location: record.location,
      created_at: record.createdAt
    }
  );

  res.json({ item: record });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const record = await queryOne(
    'SELECT id, user_id AS userId FROM records WHERE id = :id LIMIT 1',
    { id }
  );
  if (!record) {
    return res.status(404).json({ message: 'not found' });
  }

  const canDelete = req.user.role === 'admin' || record.userId === req.user.id;
  if (!canDelete) {
    return res.status(403).json({ message: 'forbidden' });
  }

  await query('DELETE FROM records WHERE id = :id', { id });
  res.json({ ok: true });
});

export default router;
