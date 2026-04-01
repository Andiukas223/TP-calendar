const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateEventsForTask } = require('../scheduler');

// GET / — list all tasks ordered by name
router.get('/', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY name').all();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — create a new task and generate events
router.post('/', (req, res) => {
  try {
    const {
      name,
      description = '',
      category = 'General',
      periodicity_days = 365,
      place = '',
      preferred_time = '09:00'
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const result = db.prepare(`
      INSERT INTO tasks (name, description, category, periodicity_days, place, preferred_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), description, category, periodicity_days, place, preferred_time);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

    const eventsCreated = generateEventsForTask(db, task);

    res.status(201).json({ task, events_created: eventsCreated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — update task fields
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const {
      name = existing.name,
      description = existing.description,
      category = existing.category,
      periodicity_days = existing.periodicity_days,
      place = existing.place,
      preferred_time = existing.preferred_time
    } = req.body;

    db.prepare(`
      UPDATE tasks
      SET name = ?, description = ?, category = ?, periodicity_days = ?, place = ?, preferred_time = ?
      WHERE id = ?
    `).run(name, description, category, periodicity_days, place, preferred_time, id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — delete task (cascade deletes events)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ success: true, id: Number(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
