import { Router } from 'express';
import { query, queryOne } from '../store/db.js';

const router = Router();

router.get('/', async (req, res) => {
  const categoryCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM categories');
  const itemCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM items');
  const recordCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM records');
  const userCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM users');

  const recordsByCategory = await query(
    `SELECT c.id AS categoryId, c.name AS categoryName, COUNT(r.id) AS count
     FROM categories c
     LEFT JOIN records r ON r.category_id = c.id
     GROUP BY c.id, c.name
     ORDER BY c.created_at DESC`
  );

  res.json({
    totals: {
      categoryCount: Number(categoryCountRow?.cnt || 0),
      itemCount: Number(itemCountRow?.cnt || 0),
      recordCount: Number(recordCountRow?.cnt || 0),
      userCount: Number(userCountRow?.cnt || 0)
    },
    recordsByCategory: (recordsByCategory || []).map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      count: Number(r.count || 0)
    }))
  });
});

export default router;
