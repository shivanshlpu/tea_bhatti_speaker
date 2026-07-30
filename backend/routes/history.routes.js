import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db/connection.js';

const router = Router();

/**
 * GET /api/history?limit=&status=&language=
 * Paginated announcement history with filters.
 */
router.get('/', (req, res) => {
  try {
    const { limit = 50, offset = 0, status, language } = req.query;

    let query = `
      SELECT h.*, i.name_en as item_name
      FROM history h
      LEFT JOIN items i ON h.item_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND h.status = ?';
      params.push(status);
    }

    if (language) {
      query += ' AND h.language_code = ?';
      params.push(language);
    }

    query += ' ORDER BY h.triggered_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const rows = queryAll(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM history WHERE 1=1';
    const countParams = [];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (language) {
      countQuery += ' AND language_code = ?';
      countParams.push(language);
    }
    const countResult = queryOne(countQuery, countParams);
    const total = countResult?.total || 0;

    res.json({ success: true, data: { rows, total, limit: Number(limit), offset: Number(offset) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/history
 * Clear all history (admin action).
 */
router.delete('/', (req, res) => {
  try {
    runSql('DELETE FROM history');
    res.json({ success: true, data: { cleared: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
