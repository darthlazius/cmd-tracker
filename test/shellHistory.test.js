const { test } = require('node:test');
const assert = require('node:assert');
const { parseBashHistory, parseZshHistory, parseFishHistory } = require('../src/utils/shellHistory');

/*
 * getHistoryFilePath() is intentionally not unit tested here — it depends on
 * detectShell()'s real process/ps inspection, which is environment-dependent
 * by design. That's verified manually across real bash/zsh/fish sessions instead.
 */

test('parseBashHistory returns only lines after the bookmarked line', () => {
  const lines = ['ls', 'cd foo', 'git status', 'npm i', 'npm test'];
  const result = parseBashHistory(lines, 3);
  assert.deepStrictEqual(result.commands, ['npm i', 'npm test']);
  assert.strictEqual(result.lastProcessedLine, 5);
});

test('parseBashHistory resets to 0 when history was cleared (bookmark ahead of file)', () => {
  const lines = ['ls', 'pwd'];
  const result = parseBashHistory(lines, 10);
  assert.deepStrictEqual(result.commands, ['ls', 'pwd']);
  assert.strictEqual(result.lastProcessedLine, 2);
});

test('parseBashHistory filters blank lines and stray comment lines', () => {
  const lines = ['ls', '', '#1700000000', 'git status'];
  const result = parseBashHistory(lines, 0);
  assert.deepStrictEqual(result.commands, ['ls', 'git status']);
});

test('parseZshHistory (EXTENDED_HISTORY) returns commands at or after the bookmarked timestamp', () => {
  const lines = [
    ': 1700000000:0;ls -la',
    ': 1700000050:0;git status',
    ': 1700000100:0;npm install'
  ];
  const result = parseZshHistory(lines, 1700000050, 0);
  assert.deepStrictEqual(result.commands, ['git status', 'npm install']);
  assert.strictEqual(result.lastImportedTimestamp, 1700000100);
});

test('parseZshHistory replays a command sharing the bookmarked second instead of dropping it', () => {
  // two commands landed in the same epoch second as the bookmark itself
  const lines = [
    ': 1700000100:0;npm install',
    ': 1700000100:0;npm test'
  ];
  const result = parseZshHistory(lines, 1700000100, 0);
  assert.deepStrictEqual(result.commands, ['npm install', 'npm test']);
});

test('parseZshHistory falls back to line-count when EXTENDED_HISTORY is not enabled', () => {
  const lines = ['ls -la', 'git status', 'npm install'];
  const result = parseZshHistory(lines, 0, 1);
  assert.deepStrictEqual(result.commands, ['git status', 'npm install']);
  assert.strictEqual(result.lastProcessedLine, 3);
});

test('parseFishHistory returns cmd entries at or after the bookmarked timestamp, ignoring paths blocks', () => {
  const lines = [
    '- cmd: ls -la',
    '  when: 1700000000',
    '- cmd: git status',
    '  when: 1700000100',
    '  paths:',
    '    - some/file',
    '- cmd: npm test',
    '  when: 1700000200'
  ];
  const result = parseFishHistory(lines, 1700000100);
  assert.deepStrictEqual(result.commands, ['git status', 'npm test']);
  assert.strictEqual(result.lastImportedTimestamp, 1700000200);
});

test('parseFishHistory replays a command sharing the bookmarked second instead of dropping it', () => {
  const lines = [
    '- cmd: npm install',
    '  when: 1700000100',
    '- cmd: npm test',
    '  when: 1700000100'
  ];
  const result = parseFishHistory(lines, 1700000100);
  assert.deepStrictEqual(result.commands, ['npm install', 'npm test']);
});
