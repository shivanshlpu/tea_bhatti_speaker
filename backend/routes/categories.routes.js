import { Router } from 'express';
import { queryAll, runSql } from '../db/connection.js';
import { isMongoConnected } from '../db/mongoConnection.js';
import { Category, Item } from '../db/mongoSchemas.js';

const router = Router();

/**
 * GET /api/categories
 * List all categories with their items nested inside.
 */
router.get('/', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const categories = await Category.find().sort({ sort_order: 1 }).lean();
      const items = await Item.find({ is_available: true }).sort({ sort_order: 1 }).lean();

      const result = categories.map((cat) => ({
        ...cat,
        items: items.filter((item) => item.category_id === cat.id)
      }));

      return res.json({ success: true, data: result });
    }

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
router.post('/', async (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    if (isMongoConnected()) {
      const last = await Category.findOne().sort({ id: -1 });
      const nextId = (last?.id || 0) + 1;
      const cat = await Category.create({ id: nextId, name, icon: icon || '🍽️', sort_order: sort_order || 0 });
      return res.json({ success: true, data: { id: cat.id } });
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
