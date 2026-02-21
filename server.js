/**
 * BACKEND SERVER
 * Run this file using node: `node server.js`
 * Dependencies: express, sqlite3, cors, body-parser
 * Install: `npm install express sqlite3 cors body-parser`
 */

import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const db = new sqlite3.Database('./sel_database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Create Users Table - Added grade and gender
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      grade TEXT,
      gender TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Responses Table
    db.run(`CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      question_id INTEGER,
      score INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  });
}

// API Routes

// 1. Create User / Login
app.post('/api/login', (req, res) => {
  const { name, avatar, grade, gender } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const stmt = db.prepare('INSERT INTO users (name, avatar, grade, gender) VALUES (?, ?, ?, ?)');
  stmt.run(name, avatar, grade, gender, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, name, avatar, grade, gender });
  });
  stmt.finalize();
});

// 2. Save Response
app.post('/api/response', (req, res) => {
  const { user_id, question_id, score } = req.body;
  
  if (!user_id || !question_id || !score) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const stmt = db.prepare('INSERT INTO responses (user_id, question_id, score) VALUES (?, ?, ?)');
  stmt.run(user_id, question_id, score, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, status: 'saved' });
  });
  stmt.finalize();
});

// 3. Admin: Get All Responses with User Details
app.get('/api/admin/responses', (req, res) => {
  const sql = `
    SELECT 
      users.id as user_id,
      users.name as user_name,
      users.avatar as user_avatar,
      users.grade as user_grade,
      users.gender as user_gender,
      responses.question_id,
      responses.score,
      responses.timestamp
    FROM responses
    JOIN users ON responses.user_id = users.id
    ORDER BY responses.timestamp DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
