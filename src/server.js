const express = require('express');
const mysql = require('mysql2');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Credentials loaded from environment variables only
const DB_PASSWORD = process.env.DB_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;

// Database connection using env vars
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin',
  password: DB_PASSWORD,
  database: process.env.DB_NAME || 'library'
});

app.use(express.json());

// FIX 1: Parameterized query to prevent SQL Injection
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  // Use parameterized query — never concatenate user input into SQL
  const query = 'SELECT * FROM users WHERE id = ?';
  db.execute(query, [userId], (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.json(results);
  });
});

// FIX 2: Use execFile() with argument array + input validation to prevent OS Command Injection
function isValidHost(host) {
  const ipv4Regex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
  const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return ipv4Regex.test(host) || hostnameRegex.test(host);
}

app.get('/ping/:host', (req, res) => {
  const host = req.params.host;

  if (!isValidHost(host)) {
    return res.status(400).json({ error: 'Invalid host format' });
  }

  // execFile does not spawn a shell — arguments are passed directly
  execFile('ping', ['-c', '4', host], { timeout: 10000 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Ping failed' });
    }
    res.json({ output: stdout });
  });
});

// FIX 3: Prevent path traversal by resolving and validating the final path
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const resolvedPath = path.resolve(UPLOADS_DIR, filename);

  // Ensure the resolved path stays within the uploads directory
  if (!resolvedPath.startsWith(UPLOADS_DIR + path.sep)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  fs.readFile(resolvedPath, (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.send(data);
  });
});

// FIX 4: Use SHA-256 instead of broken MD5 for hashing
app.post('/hash', (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }
  // SHA-256 — for production password storage, use bcrypt/argon2 instead
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  res.json({ hash });
});

// FIX 5: Remove /debug endpoint — never expose env vars or secrets
// The /debug route has been removed entirely.

// FIX 6: Remove unsafe deserialization + eval endpoint
// The /deserialize route has been removed entirely.

// FIX 7: Safe regex — no catastrophic backtracking
app.get('/validate/:input', (req, res) => {
  const input = req.params.input;
  // Replaced vulnerable /^(a+)+$/ with a safe equivalent
  const safeRegex = /^a+$/;
  const isValid = safeRegex.test(input);
  res.json({ valid: isValid });
});

// FIX 8: Encode output to prevent XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

app.get('/greet/:name', (req, res) => {
  const name = escapeHtml(req.params.name);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<h1>Hello ${name}!</h1>`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Credentials are never logged
});

module.exports = app;
