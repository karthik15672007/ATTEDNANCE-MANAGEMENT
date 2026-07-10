// Attendance Management System — Backend
// Pure Node.js (no external dependencies). Run with: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- Data helpers ----------
function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read data.json:', err);
    return [];
  }
}

function writeData(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

function nextId(records) {
  return records.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

const VALID_STATUSES = ['Present', 'Absent', 'Late'];

function validateRecord(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial || body.rollNo !== undefined) {
    if (!body.rollNo || String(body.rollNo).trim() === '') errors.push('Roll No is required.');
    else out.rollNo = String(body.rollNo).trim();
  }
  if (!partial || body.name !== undefined) {
    if (!body.name || String(body.name).trim() === '') errors.push('Name is required.');
    else out.name = String(body.name).trim();
  }
  if (!partial || body.date !== undefined) {
    if (!body.date || isNaN(Date.parse(body.date))) errors.push('A valid Date is required.');
    else out.date = String(body.date).trim();
  }
  if (!partial || body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
    else out.status = body.status;
  }

  return { errors, out };
}

// ---------- Static file serving ----------
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

function serveStatic(req, res) {
  let reqPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Prevent path traversal outside the public directory
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- JSON helpers ----------
function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy(); // 1MB safety cap
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ---------- API router ----------
async function handleApi(req, res, pathname) {
  const parts = pathname.split('/').filter(Boolean); // ['api','students', ':id'?]
  const idPart = parts[2];

  // GET /api/students  (optional ?date=YYYY-MM-DD&rollNo=&status=)
  if (req.method === 'GET' && parts.length === 2) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let records = readData();
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q'); // free-text search on name/rollNo
    if (date) records = records.filter((r) => r.date === date);
    if (status) records = records.filter((r) => r.status === status);
    if (q) {
      const needle = q.toLowerCase();
      records = records.filter(
        (r) => r.name.toLowerCase().includes(needle) || r.rollNo.toLowerCase().includes(needle)
      );
    }
    records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.rollNo.localeCompare(b.rollNo)));
    return sendJSON(res, 200, records);
  }

  // POST /api/students
  if (req.method === 'POST' && parts.length === 2) {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJSON(res, 400, { error: 'Invalid JSON body.' });
    }
    const { errors, out } = validateRecord(body);
    if (errors.length) return sendJSON(res, 400, { error: errors.join(' ') });

    const records = readData();
    const record = { id: nextId(records), ...out };
    records.push(record);
    writeData(records);
    return sendJSON(res, 201, record);
  }

  // PUT /api/students/:id
  if (req.method === 'PUT' && parts.length === 3) {
    const id = Number(idPart);
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJSON(res, 400, { error: 'Invalid JSON body.' });
    }
    const { errors, out } = validateRecord(body, { partial: true });
    if (errors.length) return sendJSON(res, 400, { error: errors.join(' ') });

    const records = readData();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return sendJSON(res, 404, { error: 'Record not found.' });
    records[idx] = { ...records[idx], ...out };
    writeData(records);
    return sendJSON(res, 200, records[idx]);
  }

  // DELETE /api/students/:id
  if (req.method === 'DELETE' && parts.length === 3) {
    const id = Number(idPart);
    const records = readData();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return sendJSON(res, 404, { error: 'Record not found.' });
    const [removed] = records.splice(idx, 1);
    writeData(records);
    return sendJSON(res, 200, removed);
  }

  return sendJSON(res, 404, { error: 'Unknown API route.' });
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname);
    } catch (err) {
      console.error(err);
      sendJSON(res, 500, { error: 'Internal server error.' });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Attendance system running at http://localhost:${PORT}`);
});
