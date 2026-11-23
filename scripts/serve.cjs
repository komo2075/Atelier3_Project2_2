const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary'};
http.createServer((req,res) => {
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  } catch { res.writeHead(400).end(); return; }
  fs.readFile(filename, (error, bytes) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(bytes);
  });
}).listen(port, process.env.HOST || '0.0.0.0', () => console.log(`ADAPT preview: http://127.0.0.1:${port}`));

for (const entries of Object.values(require('node:os').networkInterfaces())) for (const entry of entries || []) if (entry.family === 'IPv4' && !entry.internal) console.log(`Phone preview (same Wi-Fi): http://${entry.address}:${port}`);
