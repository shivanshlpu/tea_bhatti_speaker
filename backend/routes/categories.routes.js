import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db/connection.js';

const router = Router();

/**
 * GET /api/categories
 * List all categories with their items nested inside.
 */
router.get('/', (req, res) => {
  try {
    const categories = queryAll('SELECT * FROM categories ORDER BY sort_order ASC');
    const items = queryAll('SELECT * FROM items WHERE active = 1 ORDER BY sort_order ASC');

    const result = categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => item.category_id === cat.id)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/categories
 * Create a new category.
 */
router.post('/', (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const result = runSql(
      'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)',
      [name, icon || null, sort_order || 0]
    );

    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
