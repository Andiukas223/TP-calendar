const express = require('express');
const cors = require('cors');
const db = require('./db');
const { generateAllEvents } = require('./scheduler');
const tasksRouter = require('./routes/tasks');
const eventsRouter = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/events', eventsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Maintenance Calendar API running on port ${PORT}`);

  // Generate future events for all tasks on startup
  try {
    const created = generateAllEvents(db);
    if (created > 0) {
      console.log(`Generated ${created} new events on startup`);
    }
  } catch (err) {
    console.error('Error generating events on startup:', err.message);
  }
});

module.exports = app;
