const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

let bookmark;
let tempDir;
let originalCwd;

/*
 * bookmark.js resolves .tracker/meta.json from process.cwd() at require time,
 * so we chdir into an isolated temp folder BEFORE requiring it — same trick
 * used for manual testing during development
 */
before(() => {
  originalCwd = process.cwd();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdtracker-bookmark-'));
  process.chdir(tempDir);
  bookmark = require('../src/utils/bookmark');
});

after(() => {
  process.chdir(originalCwd);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('getDefaultBookmark returns a fresh object each call', () => {
  const a = bookmark.getDefaultBookmark();
  const b = bookmark.getDefaultBookmark();
  assert.notStrictEqual(a, b);
  assert.deepStrictEqual(a, b);
});

test('readBookmark returns defaults when no meta.json exists yet', () => {
  const result = bookmark.readBookmark();
  assert.deepStrictEqual(result, bookmark.getDefaultBookmark());
});

test('writeBookmark then readBookmark round-trips data', () => {
  bookmark.writeBookmark({ last_processed_line: 42, last_imported_timestamp: 1700000000 });
  const result = bookmark.readBookmark();
  assert.strictEqual(result.last_processed_line, 42);
  assert.strictEqual(result.last_imported_timestamp, 1700000000);
});

test('readBookmark falls back to defaults when meta.json is corrupted', () => {
  const metaFile = path.join(tempDir, '.tracker', 'meta.json');
  fs.mkdirSync(path.dirname(metaFile), { recursive: true });
  fs.writeFileSync(metaFile, '{ this is not valid json');

  const result = bookmark.readBookmark();
  assert.deepStrictEqual(result, bookmark.getDefaultBookmark());
});
