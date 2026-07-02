/*
 * import.js
 *
 * Handles "tracker import" — reads the user's existing shell history file
 * and saves any commands we haven't seen before into commands.json
 *
 * Uses the bookmark (.tracker/meta.json) so repeated runs only process
 * NEW entries instead of re-scanning the whole history file every time
 */

const fs = require('node:fs');
const colors = require('../utils/colors');
const { isInitialized, showInitError } = require('../utils/validator');
const { detectShell } = require('../utils/hook');
const {
  getHistoryFilePath,
  parseBashHistory,
  parseZshHistory,
  parseFishHistory
} = require('../utils/shellHistory');
const { readBookmark, writeBookmark } = require('../utils/bookmark');
const { saveCommands } = require('../utils/storage');

function importCommand() {

  if (!isInitialized()) {
    showInitError();
    return;
  }

  const shell = detectShell();

  if (shell === 'unknown') {
    console.log(colors.error('\n❌ Could not detect your shell (bash/zsh/fish supported)\n'));
    return;
  }

  const historyPath = getHistoryFilePath();

  if (!historyPath || !fs.existsSync(historyPath)) {
    console.log(colors.error(`\n❌ History file not found: ${historyPath}\n`));
    return;
  }

  const fileContent = fs.readFileSync(historyPath, 'utf-8');
  const lines = fileContent.split('\n');
  const bookmark = readBookmark();

  /*
   * Each shell has a different history format, so we pick the parser
   * that matches — bash/zsh (no EXTENDED_HISTORY) use line position,
   * zsh (EXTENDED_HISTORY) and fish use timestamps
   */
  let result;
  if (shell === 'bash') {
    result = parseBashHistory(lines, bookmark.last_processed_line);
  }
  else if (shell === 'zsh') {
    result = parseZshHistory(lines, bookmark.last_imported_timestamp, bookmark.last_processed_line);
  }
  else {
    result = parseFishHistory(lines, bookmark.last_imported_timestamp);
  }

  const { savedCount, duplicateCount } = saveCommands(result.commands);

  writeBookmark({
    last_processed_line: result.lastProcessedLine !== undefined
      ? result.lastProcessedLine
      : bookmark.last_processed_line,
    last_imported_timestamp: result.lastImportedTimestamp !== undefined
      ? result.lastImportedTimestamp
      : bookmark.last_imported_timestamp
  });

  console.log(colors.success(`\n✅ Import complete: ${savedCount} new command(s) saved`));
  if (duplicateCount > 0) {
    console.log(colors.dim(`   (${duplicateCount} already existed, skipped)`));
  }
  console.log('');
}

module.exports = { importCommand };
