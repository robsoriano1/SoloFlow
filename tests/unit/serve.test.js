import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { contentTypeFor, createStaticServer, resolveRequestPath } from '../../scripts/serve.mjs';

const ROOT = resolve('/srv/app');

test('maps request paths to files under the root', () => {
  assert.equal(resolveRequestPath(ROOT, '/index.html'), join(ROOT, 'index.html'));
  assert.equal(resolveRequestPath(ROOT, '/modules/tasks.js?v=3'), join(ROOT, 'modules', 'tasks.js'));
  assert.equal(resolveRequestPath(ROOT, '/'), ROOT);
  assert.equal(resolveRequestPath(ROOT, '/My%20File.txt'), join(ROOT, 'My File.txt'));
});

test('refuses paths outside the root, dotfiles and node_modules', () => {
  for (const path of ['/..%2f..%2fetc/passwd', '/..%5c..%5cwindows', '/.git/config', '/.env', '/node_modules/firebase/package.json', '/a/%00b', '/%E0%A4%A']) {
    assert.equal(resolveRequestPath(ROOT, path), null, path);
  }
});

test('URL normalisation keeps ../ requests inside the root', () => {
  // The URL parser resolves "/../x" and "/%2e%2e/x" to "/x" before the server sees it.
  assert.equal(resolveRequestPath(ROOT, '/../etc/passwd'), join(ROOT, 'etc', 'passwd'));
  assert.equal(resolveRequestPath(ROOT, '/%2e%2e/%2e%2e/etc/passwd'), join(ROOT, 'etc', 'passwd'));
});

test('sends the right content types', () => {
  assert.match(contentTypeFor('index.html'), /^text\/html/);
  assert.match(contentTypeFor('bootstrap.js'), /^text\/javascript/);
  assert.match(contentTypeFor('styles/architecture.css'), /^text\/css/);
  assert.match(contentTypeFor('manifest.webmanifest'), /^application\/manifest\+json/);
  assert.equal(contentTypeFor('assets/icon.svg'), 'image/svg+xml');
  assert.equal(contentTypeFor('unknown.bin'), 'application/octet-stream');
});

test('serves files and index.html for directories over HTTP', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'soloflow-serve-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'index.html'), '<h1>home</h1>');
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'index.html'), '<h1>docs</h1>');
  await writeFile(join(root, '.secret'), 'hidden');

  const server = createStaticServer({ root });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise((done) => server.close(done)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /^text\/html/);
  assert.equal(await home.text(), '<h1>home</h1>');

  assert.equal(await (await fetch(`${base}/docs/`)).text(), '<h1>docs</h1>');
  assert.equal((await fetch(`${base}/.secret`)).status, 404);
  assert.equal((await fetch(`${base}/missing.js`)).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
});
