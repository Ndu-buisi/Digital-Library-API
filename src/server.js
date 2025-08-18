const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const moment = require('moment');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Simulated database
const users = [];
const documents = [];

// SECURITY ISSUE: Hardcoded secret (for secret detection demo)
const JWT_SECRET = "hardcoded-jwt-secret-key-12345";

// SECURITY ISSUE: SQL Injection vulnerability (for SAST demo)
const getUserById = (id) => {
  const query = `SELECT * FROM users WHERE id = ${id}`;
  console.log('Executing query:', query);
  return users.find(u => u.id == id);
};

// SECURITY ISSUE: Command injection vulnerability (for SAST demo)
const processCommand = (userInput) => {
  const { exec } = require('child_process');
  const command = `echo ${userInput}`;
  exec(command, (error, stdout, stderr) => {
    if (error) console.error('Command error:', error);
  });
};

// SECURITY ISSUE: Path traversal vulnerability (for SAST demo)
app.get('/file/:filename', (req, res) => {
  const fs = require('fs');
  const filename = req.params.filename;
  fs.readFile(`./uploads/${filename}`, (err, data) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    } else {
      res.send(data);
    }
  });
});

// Authentication endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // SECURITY ISSUE: Vulnerable lodash usage
    const userTemplate = _.template('Hello <%= user %>!');
    const greeting = userTemplate({ user: username });
    
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      greeting,
      loginTime: moment().format('YYYY-MM-DD HH:mm:ss')
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: moment().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Documents endpoint
app.get('/documents', (req, res) => {
  const limit = req.query.limit || 10;
  const offset = req.query.offset || 0;
  
  // SECURITY ISSUE: Command injection vulnerability
  processCommand(req.query.search || '');
  
  const paginatedDocs = documents.slice(offset, offset + limit);
  res.json({
    documents: paginatedDocs,
    total: documents.length,
    limit,
    offset
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
