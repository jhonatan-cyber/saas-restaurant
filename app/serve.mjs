/**
 * Production server wrapper for TanStack Start (Vite plugin build).
 *
 * - dist/client/  → static assets (JS, CSS, images) served directly
 * - Everything else → SSR fetch handler from dist/server/server.js
 */
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, extname } from 'node:path';

const PORT = Number(process.env.PORT ?? process.env.APP_PORT ?? 3000);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, 'dist/client');

// MIME types for static assets
const MIME = {
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.html':  'text/html',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.map':   'application/json',
};

// Import the TanStack Start SSR handler
const { default: app } = await import(join(__dirname, 'dist/server/server.js'));
const fetchHandler = app?.fetch ?? app;

if (typeof fetchHandler !== 'function') {
  console.error('Could not find fetch handler in dist/server/server.js');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  const pathname = url.split('?')[0];

  // --- Serve static assets from dist/client ---
  // Assets are under /assets/, also handle root-level files like favicon.ico
  const staticPath = join(CLIENT_DIR, pathname);
  if (existsSync(staticPath) && statSync(staticPath).isFile()) {
    const ext = extname(staticPath).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    // Hashed assets get long-lived cache, others get no-cache
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
    createReadStream(staticPath).pipe(res);
    return;
  }

  // --- SSR: pass everything else to TanStack Start ---
  try {
    const fullUrl = `http://${req.headers.host ?? `localhost:${PORT}`}${url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const request = new Request(fullUrl, {
      method: req.method ?? 'GET',
      headers,
      body: body && body.length > 0 ? body : undefined,
      duplex: 'half',
    });

    const response = await fetchHandler(request);

    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('SSR error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
