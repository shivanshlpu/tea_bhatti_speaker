import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db/connection.js';
import { isMongoConnected } from '../db/mongoConnection.js';
import { Item } from '../db/mongoSchemas.js';

const router = Router();

/**
 * GET /api/items?search=
 * List all active items, optionally filtered by search query.
 */
router.get('/', async (req, res) => {
  try {
    const { search, category_id } = req.query;

    if (isMongoConnected()) {
      const filter = { is_available: true };
      if (category_id) filter.category_id = Number(category_id);
      if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [{ name_en: regex }, { name_hi: regex }, { name_bho: regex }];
      }

      const items = await Item.find(filter).sort({ sort_order: 1 }).lean();
      return res.json({ success: true, data: items });
    }

    let query = 'SELECT * FROM items WHERE active = 1';
    const params = [];

    if (category_id) {
      query += ' AND category_id = ?';
      params.push(Number(category_id));
    }

    if (search) {
      query += ' AND (name_en LIKE ? OR name_hi LIKE ? OR name_bho LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY sort_order ASC';
    const items = queryAll(query, params);

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/items
 * Create a new menu item.
 */
router.post('/', async (req, res) => {
  try {
    const { category_id, name_en, name_hi, name_bho, image_url, price, is_popular, sort_order } = req.body;

    if (!category_id || !name_en) {
      return res.status(400).json({ success: false, error: 'category_id and name_en are required' });
    }

    if (isMongoConnected()) {
      const last = await Item.findOne().sort({ id: -1 });
      const nextId = (last?.id || 0) + 1;
      const item = await Item.create({
        id: nextId,
        category_id: Number(category_id),
        name_en,
        name_hi: name_hi || '',
        name_bho: name_bho || '',
        price: price || 99,
        image_url: image_url || '/images/logo.png',
        is_popular: is_popular || false,
        sort_order: sort_order || 0
      });
      return res.json({ success: true, data: { id: item.id } });
    }

    const result = runSql(
      'INSERT INTO items (category_id, name_en, name_hi, name_bho, image_url, is_favorite, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category_id, name_en, name_hi || null, name_bho || null, image_url || null, is_popular ? 1 : 0, sort_order || 0]
    );

    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
