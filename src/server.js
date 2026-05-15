const express = require('express');
const mysql = require('mysql2');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Secrets loaded from environment variables — never hardcoded
const DB_PASSWORD = process.env.DB_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;

if (!DB_PASSWORD || !JWT_SECRET || !API_KEY) {
  console.error('ERROR: Required environment variables DB_PASSWORD, JWT_SECRET, and API_KEY must be set.');
  process.exit(1);
}

// Database connection using environment-supplied credentials
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin',
  password: DB_PASSWORD,
  database: 'library'
});

app.use(express.json());

// FIX 1: SQL Injection — use parameterized queries
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  // Parameterized query prevents SQL injection
  const query = 'SELECT * FROM users WHERE id = ?';
  db.execute(query, [userId], (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.json(results);
  });
});

// FIX 2: OS Command Injection — use execFile with argument array + input validation
function isValidHost(host) {
  // Allow only valid IPv4, IPv6, or safe hostnames (alphanumeric, dots, hyphens)
  const ipv4Regex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
  const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/;
  return ipv4Regex.test(host) || hostnameRegex.test(host);
}

app.get('/ping/:host', (req, res) => {
  const host = req.params.host;

  if (!isValidHost(host)) {
    return res.status(400).json({ error: 'Invalid host format' });
  }

  // execFile does NOT spawn a shell — arguments are passed directly to the OS
  execFile('ping', ['-c', '4', host], { timeout: 10000 }, (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: 'Ping failed' });
    }
    res.json({ output: stdout });
  });
});

// FIX 3: Path Traversal — normalize and confine to uploads directory
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

// FIX 4: Weak cryptography — use bcrypt-compatible PBKDF2 instead of MD5
app.post('/hash', (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid password' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  // PBKDF2 with SHA-256, 100,000 iterations — cryptographically strong
  crypto.pbkdf2(password, salt, 100000, 64, 'sha256', (err, derivedKey) => {
    if (err) return res.status(500).json({ error: 'Hashing failed' });
    res.json({ hash: `${salt}:${derivedKey.toString('hex')}` });
  });
});

// FIX 5: Removed /debug endpoint — it exposed process.env, secrets, and system info

// FIX 6: Eval Injection — removed eval(); validate and process data safely
app.post('/deserialize', (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    // Never execute dynamic code from user input
    if (typeof data !== 'object' || data === null) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    // Process only known, safe fields
    const safeResult = {
      received: Object.keys(data).filter(k => typeof data[k] !== 'function')
    };
    res.json({ status: 'processed', result: safeResult });
  } catch (error) {
    res.status(400).json({ error: 'Invalid JSON' });
  }
});

// FIX 7: ReDoS — replace catastrophic backtracking regex with a safe alternative
app.get('/validate/:input', (req, res) => {
  const input = req.params.input;
  // Safe regex: simple character class, no nested quantifiers
  const safeRegex = /^[a-zA-Z0-9_-]{1,100}$/;
  const isValid = safeRegex.test(input);
  res.json({ valid: isValid });
});

// FIX 8: XSS — HTML-encode user-supplied values before rendering
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
  // Do NOT log secrets or sensitive configuration
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
