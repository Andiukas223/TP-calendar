/**
 * Generates scheduled events for maintenance tasks.
 */

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

/**
 * Generate events for a single task from today up to 3 years from now.
 * @param {import('better-sqlite3').Database} db
 * @param {object} task
 * @returns {number} count of events created
 */
function generateEventsForTask(db, task) {
  const today = toDateString(new Date());
  const threeYearsLater = addDays(today, 365 * 3);

  // Get all existing event dates for this task
  const existingEvents = db.prepare(
    'SELECT scheduled_date FROM events WHERE task_id = ?'
  ).all(task.id);

  const existingDates = new Set(existingEvents.map(e => e.scheduled_date));

  const insertEvent = db.prepare(`
    INSERT INTO events (task_id, task_name, scheduled_date, scheduled_time, place, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `);

  let count = 0;
  let currentDate = today;

  while (currentDate <= threeYearsLater) {
    // Check if an event already exists within ±1 day
    const dayBefore = addDays(currentDate, -1);
    const dayAfter = addDays(currentDate, 1);

    const hasNearby = existingDates.has(dayBefore) ||
                      existingDates.has(currentDate) ||
                      existingDates.has(dayAfter);

    if (!hasNearby) {
      insertEvent.run(
        task.id,
        task.name,
        currentDate,
        task.preferred_time || '09:00',
        task.place || ''
      );
      existingDates.add(currentDate);
      count++;
    }

    currentDate = addDays(currentDate, task.periodicity_days);
  }

  return count;
}

/**
 * Generate events for all tasks.
 * @param {import('better-sqlite3').Database} db
 * @returns {number} total events created
 */
function generateAllEvents(db) {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  let total = 0;
  for (const task of tasks) {
    total += generateEventsForTask(db, task);
  }
  return total;
}

module.exports = { generateEventsForTask, generateAllEvents };
