import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db/connection.js';

const router = Router();

/**
 * GET /api/items?search=
 * List all active items, optionally filtered by search query.
 */
router.get('/', (req, res) => {
  try {
    const { search, category_id } = req.query;
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
router.post('/', (req, res) => {
  try {
    const { category_id, name_en, name_hi, name_bho, is_favorite, sort_order } = req.body;

    if (!category_id || !name_en) {
      return res.status(400).json({ success: false, error: 'category_id and name_en are required' });
    }

    const result = runSql(
      'INSERT INTO items (category_id, name_en, name_hi, name_bho, is_favorite, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, name_en, name_hi || null, name_bho || null, is_favorite || 0, sort_order || 0]
    );

    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/items/:id
 * Update an existing item.
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name_en, name_hi, name_bho, is_favorite, sort_order, active } = req.body;

    const existing = queryOne('SELECT * FROM items WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    runSql(`
      UPDATE items SET
        category_id = COALESCE(?, category_id),
        name_en = COALESCE(?, name_en),
        name_hi = COALESCE(?, name_hi),
        name_bho = COALESCE(?, name_bho),
        is_favorite = COALESCE(?, is_favorite),
        sort_order = COALESCE(?, sort_order),
        active = COALESCE(?, active)
      WHERE id = ?
    `, [
      category_id ?? null, name_en ?? null, name_hi ?? null, name_bho ?? null,
      is_favorite ?? null, sort_order ?? null, active ?? null, Number(id)
    ]);

    const updated = queryOne('SELECT * FROM items WHERE id = ?', [Number(id)]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/items/:id
 * Soft-delete an item (sets active = 0).
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = runSql('UPDATE items SET active = 0 WHERE id = ?', [Number(id)]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
