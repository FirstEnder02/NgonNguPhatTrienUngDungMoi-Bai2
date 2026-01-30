const { createServer } = require('http');
const { readFileSync, existsSync, statSync, writeFileSync } = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

let db = JSON.parse(readFileSync('./db.json', 'utf-8'));

function saveDb() {
  writeFileSync('./db.json', JSON.stringify(db, null, 2));
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  
  if (pathname === '/') pathname = '/Index.html';

  const pathsToTry = [
    path.join(__dirname, 'html', pathname),
    path.join(__dirname, pathname)
  ];

  let found = false;
  for (const filePath of pathsToTry) {
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      try {
        const content = readFileSync(filePath);
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        });
        res.end(content);
        found = true;
        break;
      } catch (err) {}
    }
  }
  if (found) return;
  if (pathname === '/posts' || pathname.startsWith('/posts/')) {
    const parts = pathname.split('/').filter(Boolean);
    const id = parts[1];
    
    if (req.method === 'GET') {
      if (id) {
        const post = db.posts.find(p => p.id === id);
        if (post) sendJson(res, post);
        else sendJson(res, { error: 'Not found' }, 404);
      } else {
        sendJson(res, db.posts);
      }
    } else if (req.method === 'POST') {
      const body = await parseBody(req);
      db.posts.push(body);
      saveDb();
      sendJson(res, body, 201);
    } else if (req.method === 'PATCH' && id) {
      const body = await parseBody(req);
      const idx = db.posts.findIndex(p => p.id === id);
      if (idx !== -1) {
        db.posts[idx] = { ...db.posts[idx], ...body };
        saveDb();
        sendJson(res, db.posts[idx]);
      } else {
        sendJson(res, { error: 'Not found' }, 404);
      }
    } else if (req.method === 'DELETE' && id) {
      const idx = db.posts.findIndex(p => p.id === id);
      if (idx !== -1) {
        const deleted = db.posts.splice(idx, 1);
        saveDb();
        sendJson(res, deleted[0]);
      } else {
        sendJson(res, { error: 'Not found' }, 404);
      }
    } else {
      sendJson(res, { error: 'Method not allowed' }, 405);
    }
    return;
  }
  
  if (pathname === '/comments' || pathname.startsWith('/comments/')) {
    const parts = pathname.split('/').filter(Boolean);
    const id = parts[1];
    
    if (req.method === 'GET') {
      if (id) {
        const comment = db.comments.find(c => c.id === id);
        if (comment) sendJson(res, comment);
        else sendJson(res, { error: 'Not found' }, 404);
      } else {
        sendJson(res, db.comments);
      }
    } else if (req.method === 'POST') {
      const body = await parseBody(req);
      db.comments.push(body);
      saveDb();
      sendJson(res, body, 201);
    } else if (req.method === 'PATCH' && id) {
      const body = await parseBody(req);
      const idx = db.comments.findIndex(c => c.id === id);
      if (idx !== -1) {
        db.comments[idx] = { ...db.comments[idx], ...body };
        saveDb();
        sendJson(res, db.comments[idx]);
      } else {
        sendJson(res, { error: 'Not found' }, 404);
      }
    } else if (req.method === 'DELETE' && id) {
      const idx = db.comments.findIndex(c => c.id === id);
      if (idx !== -1) {
        const deleted = db.comments.splice(idx, 1);
        saveDb();
        sendJson(res, deleted[0]);
      } else {
        sendJson(res, { error: 'Not found' }, 404);
      }
    } else {
      sendJson(res, { error: 'Method not allowed' }, 405);
    }
    return;
  }
  
  if (pathname === '/profile') {
    if (req.method === 'GET') {
      sendJson(res, db.profile);
    } else if (req.method === 'PATCH') {
      const body = await parseBody(req);
      db.profile = { ...db.profile, ...body };
      saveDb();
      sendJson(res, db.profile);
    } else {
      sendJson(res, { error: 'Method not allowed' }, 405);
    }
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
