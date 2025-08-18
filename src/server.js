const express = require('express');
const mysql = require('mysql2'); // SQL injection prone
const { exec } = require('child_process'); // Command injection prone
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// SAST ISSUE 1: Hardcoded credentials (High severity)
const DB_PASSWORD = "admin123456";
const JWT_SECRET = "my-super-secret-jwt-key-12345";
const API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz";

// SAST ISSUE 2: SQL Injection vulnerability (Critical severity)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'admin',
  password: DB_PASSWORD,
  database: 'library'
});

app.use(express.json());

// SAST ISSUE 3: Direct SQL injection (Critical)
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  // Direct string concatenation = SQL injection
  const query = "SELECT * FROM users WHERE id = " + userId;
  db.execute(query, (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.json(results);
  });
});

// SAST ISSUE 4: Command injection (High severity)
app.get('/ping/:host', (req, res) => {
  const host = req.params.host;
  // Direct command execution with user input
  exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Ping failed' });
    }
    res.json({ output: stdout });
  });
});

// SAST ISSUE 5: Path traversal (High severity) 
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  // No path validation = directory traversal
  const filePath = `./uploads/${filename}`;
  fs.readFile(filePath, (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.send(data);
  });
});

// SAST ISSUE 6: Weak cryptography (Medium severity)
app.post('/hash', (req, res) => {
  const { password } = req.body;
  // MD5 is cryptographically broken
  const hash = crypto.createHash('md5').update(password).digest('hex');
  res.json({ hash });
});

// SAST ISSUE 7: Information disclosure (Medium severity)
app.get('/debug', (req, res) => {
  // Exposing internal system information
  res.json({
    env: process.env,
    version: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    secret: JWT_SECRET // Exposing secrets
  });
});

// SAST ISSUE 8: Unsafe deserialization (High severity)
app.post('/deserialize', (req, res) => {
  try {
    // Unsafe JSON parsing without validation
    const data = JSON.parse(req.body.data);
    eval(data.code); // Code injection via eval
    res.json({ status: 'executed' });
  } catch (error) {
    res.status(500).json({ error: 'Execution failed' });
  }
});

// SAST ISSUE 9: Regex DoS (Medium severity)
app.get('/validate/:input', (req, res) => {
  const input = req.params.input;
  // Catastrophic backtracking regex
  const vulnerableRegex = /^(a+)+$/;
  const isValid = vulnerableRegex.test(input);
  res.json({ valid: isValid });
});

// SAST ISSUE 10: XSS via template (Medium severity)
app.get('/greet/:name', (req, res) => {
  const name = req.params.name;
  // Direct template injection
  const template = `<h1>Hello ${name}!</h1>`;
  res.send(template);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database password: ${DB_PASSWORD}`); // Password in logs
  console.log(`JWT Secret: ${JWT_SECRET}`); // Secret in logs
});

module.exports = app;
