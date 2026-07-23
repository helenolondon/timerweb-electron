const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 4567;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Determine database path based on environment
let dbPath;
if (process.env.ELECTRON_USER_DATA_PATH) {
  // Running in Electron - use userData directory from environment variable
  dbPath = path.join(process.env.ELECTRON_USER_DATA_PATH, 'calendar.db');
} else {
  // Running standalone - use local directory
  dbPath = './calendar.db';
}

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// Create appointments table
function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      jira_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Appointments table ready');
    }
  });
}

// API Routes

// Get all appointments
app.get('/api/appointments', (req, res) => {
  const query = 'SELECT * FROM appointments ORDER BY start_time';
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get appointments by date range
app.get('/api/appointments/range', (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }
  
  // Extract date part only (YYYY-MM-DD) to avoid time comparison issues
  const start = new Date(startDate).toISOString().split('T')[0];
  const end = new Date(endDate).toISOString().split('T')[0];
  
  const query = `
    SELECT * FROM appointments 
    WHERE date(start_time) >= ? AND date(start_time) <= ?
    ORDER BY start_time
  `;
  
  db.all(query, [start, end], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get appointment by ID
app.get('/api/appointments/:id', (req, res) => {
  const query = 'SELECT * FROM appointments WHERE id = ?';
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.json(row);
  });
});

// Create new appointment
app.post('/api/appointments', (req, res) => {
  const { description, start_time, end_time, jira_number } = req.body;
  
  if (!description || !start_time || !end_time) {
    res.status(400).json({ error: 'Description, start_time, and end_time are required' });
    return;
  }
  
  const query = `
    INSERT INTO appointments (description, start_time, end_time, jira_number)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(query, [description, start_time, end_time, jira_number], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({
      id: this.lastID,
      description,
      start_time,
      end_time,
      jira_number
    });
  });
});

// Update appointment
app.put('/api/appointments/:id', (req, res) => {
  const { description, start_time, end_time, jira_number } = req.body;
  
  const query = `
    UPDATE appointments
    SET description = ?, start_time = ?, end_time = ?, jira_number = ?
    WHERE id = ?
  `;
  
  db.run(query, [description, start_time, end_time, jira_number, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.json({ message: 'Appointment updated successfully' });
  });
});

// Delete appointment
app.delete('/api/appointments/:id', (req, res) => {
  const query = 'DELETE FROM appointments WHERE id = ?';
  
  db.run(query, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.json({ message: 'Appointment deleted successfully' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
