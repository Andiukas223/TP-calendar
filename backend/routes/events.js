const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateEventsForTask } = require('../scheduler');

// GET / — list events with optional filters
router.get('/', (req, res) => {
  try {
    const { start, end, status, place, task_id } = req.query;

    let query = `
      SELECT e.*, t.periodicity_days, t.category, t.description as task_description
      FROM events e
      JOIN tasks t ON e.task_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (start) {
      query += ' AND e.scheduled_date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND e.scheduled_date <= ?';
      params.push(end);
    }
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (place) {
      query += ' AND e.place = ?';
      params.push(place);
    }
    if (task_id) {
      query += ' AND e.task_id = ?';
      params.push(task_id);
    }

    query += ' ORDER BY e.scheduled_date ASC';

    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /upcoming — next 10 pending events
router.get('/upcoming', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const events = db.prepare(`
      SELECT e.*, t.periodicity_days, t.category
      FROM events e
      JOIN tasks t ON e.task_id = t.id
      WHERE e.status = 'pending' AND e.scheduled_date >= ?
      ORDER BY e.scheduled_date ASC
      LIMIT 10
    `).all(today);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — update event
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const event = db.prepare(`
      SELECT e.*, t.periodicity_days
      FROM events e
      JOIN tasks t ON e.task_id = t.id
      WHERE e.id = ?
    `).get(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const {
      status = event.status,
      notes = event.notes,
      scheduled_date = event.scheduled_date,
      scheduled_time = event.scheduled_time
    } = req.body;

    let completed_at = event.completed_at;
    const now = new Date().toISOString();

    // If marking as done, set completed_at
    if (status === 'done' && event.status !== 'done') {
      completed_at = now;
    }

    db.prepare(`
      UPDATE events
      SET status = ?, notes = ?, scheduled_date = ?, scheduled_time = ?, completed_at = ?
      WHERE id = ?
    `).run(status, notes, scheduled_date, scheduled_time, completed_at, id);

    // If marked done, regenerate future events for the task if needed
    if (status === 'done' && event.status !== 'done') {
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(event.task_id);
      if (task) {
        const today = new Date().toISOString().split('T')[0];

        // Check if there are future pending events after today + periodicity - 30 days
        function addDays(dateStr, days) {
          const d = new Date(dateStr + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() + days);
          return d.toISOString().split('T')[0];
        }

        const threshold = addDays(today, task.periodicity_days - 30);
        const futurePending = db.prepare(`
          SELECT COUNT(*) as cnt
          FROM events
          WHERE task_id = ? AND status = 'pending' AND scheduled_date > ?
        `).get(event.task_id, threshold);

        if (!futurePending || futurePending.cnt === 0) {
          generateEventsForTask(db, task);
        }
      }
    }

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — delete single event
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    res.json({ success: true, id: Number(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
