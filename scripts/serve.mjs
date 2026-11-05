#!/usr/bin/env node
// A tiny static file server for local development and the Playwright tests.
// It has no dependencies, serves the repository root, and never serves
// dotfiles or node_modules, so it behaves like the deployed static site.
//
// Usage: node scripts/serve.mjs [--port 8080] [--host 127.0.0.1]

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

export function contentTypeFor(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Maps a request path to a file under root, or returns null when the path
// must not be served: it escapes root, names a dotfile, or is in node_modules.
export function resolveRequestPath(root, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some((segment) => segment.startsWith('.') || segment === 'node_modules')) return null;
  const absoluteRoot = resolve(root);
  const target = normalize(join(absoluteRoot, ...segments));
  if (target !== absoluteRoot && !target.startsWith(absoluteRoot + sep)) return null;
  return target;
}

export function createStaticServer({ root = DEFAULT_ROOT } = {}) {
  return createServer(async (request, response) => {
    const send = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(message);
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'Method not allowed');

    let filePath = resolveRequestPath(root, request.url);
    if (!filePath) return send(404, 'Not found');
    try {
      let info = await stat(filePath);
      if (info.isDirectory()) {
        filePath = join(filePath, 'index.html');
        info = await stat(filePath);
      }
      response.writeHead(200, {
        'Content-Type': contentTypeFor(filePath),
        'Content-Length': info.size,
        'Cache-Control': 'no-store'
      });
      if (request.method === 'HEAD') return response.end();
      createReadStream(filePath).pipe(response);
    } catch {
      send(404, 'Not found');
    }
  });
}

function readArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(readArgument('port', process.env.PORT || 8080));
  const host = readArgument('host', '127.0.0.1');
  createStaticServer().listen(port, host, () => {
    console.log(`SoloFlow is being served at http://${host}:${port}/index.html`);
  });
}
