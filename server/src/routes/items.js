import { Router } from 'express';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../store/db.js';

const router = Router();

function parseKeywordsJson(keywordsJson) {
  try {
    const arr = JSON.parse(keywordsJson || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function normalizeKeywords(keywords) {
  if (keywords === undefined) return undefined;
  if (Array.isArray(keywords)) return keywords;
  if (keywords === null) return [];
  return String(keywords)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

router.get('/', async (req, res) => {
  const { q, categoryId } = req.query;

  const where = [];
  const params = {};

  if (categoryId) {
    where.push('category_id = :categoryId');
    params.categoryId = String(categoryId);
  }
  if (q) {
    where.push('LOWER(name) LIKE :q');
    params.q = `%${String(q).toLowerCase()}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(
    `SELECT id, name, category_id AS categoryId, keywords_json, created_at AS createdAt FROM items ${whereSql} ORDER BY created_at DESC`,
    params
  );

  const list = (rows || []).map((r) => ({
    id: r.id,
    name: r.name,
    categoryId: r.categoryId,
    keywords: parseKeywordsJson(r.keywords_json),
    createdAt: r.createdAt
  }));

  res.json({ list });
});

router.post('/', async (req, res) => {
  const { name, categoryId, keywords } = req.body || {};
  if (!name || !categoryId) {
    return res.status(400).json({ message: 'name and categoryId required' });
  }

  const category = await queryOne('SELECT id FROM categories WHERE id = :id LIMIT 1', { id: categoryId });
  if (!category) {
    return res.status(400).json({ message: 'invalid categoryId' });
  }

  const normalizedKeywords = normalizeKeywords(keywords) ?? [];
  const item = {
    id: nanoid(),
    name,
    categoryId,
    keywords: normalizedKeywords,
    createdAt: new Date()
  };

  await query(
    'INSERT INTO items (id, name, category_id, keywords_json, created_at) VALUES (:id, :name, :category_id, :keywords_json, :created_at)',
    {
      id: item.id,
      name: item.name,
      category_id: item.categoryId,
      keywords_json: JSON.stringify(item.keywords),
      created_at: item.createdAt
    }
  );

  res.json({ item });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, categoryId, keywords } = req.body || {};

  const existing = await queryOne(
    'SELECT id, name, category_id AS categoryId, keywords_json, created_at AS createdAt FROM items WHERE id = :id LIMIT 1',
    { id }
  );
  if (!existing) {
    return res.status(404).json({ message: 'not found' });
  }

  if (categoryId) {
    const category = await queryOne('SELECT id FROM categories WHERE id = :id LIMIT 1', { id: categoryId });
    if (!category) {
      return res.status(400).json({ message: 'invalid categoryId' });
    }
  }

  const nextKeywords = normalizeKeywords(keywords);
  const next = {
    id,
    name: name ?? existing.name,
    categoryId: categoryId ?? existing.categoryId,
    keywords: nextKeywords === undefined ? parseKeywordsJson(existing.keywords_json) : nextKeywords,
    createdAt: existing.createdAt
  };

  await query(
    'UPDATE items SET name = :name, category_id = :categoryId, keywords_json = :keywordsJson WHERE id = :id',
    {
      id,
      name: next.name,
      categoryId: next.categoryId,
      keywordsJson: JSON.stringify(next.keywords)
    }
  );

  res.json({ item: next });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await query('DELETE FROM items WHERE id = :id', { id });
  const affected = Number(result?.affectedRows || 0);
  if (affected === 0) {
    return res.status(404).json({ message: 'not found' });
  }
  res.json({ ok: true });
});

export default router;
