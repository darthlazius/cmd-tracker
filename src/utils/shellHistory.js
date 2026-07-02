const path = require('path');
const os = require('node:os');
const { detectShell } = require('./hook');

function getHistoryFilePath() {
  const shell = detectShell();
  const home = os.homedir();
  let history_path;

  if (shell == 'bash') {
    history_path = path.join(home, '.bash_history');
  }
  else if (shell == 'zsh') {
    history_path = path.join(home, '.zsh_history');
  }
  else if (shell == 'fish') {
    const dataHome = process.env.XDG_DATA_HOME || path.join(home, '.local/share');
    history_path = path.join(dataHome, 'fish/fish_history');
  }
  else {
    return null;
  }

  return history_path;
}

function parseBashHistory(lines, lastProcessedLine) {
  const cleanLines = lines.filter(line => line.trim().length > 0 && !line.startsWith('#'));
  const currentTotalLines = cleanLines.length;

  let startIndex = lastProcessedLine;
  if (startIndex > currentTotalLines) {
    startIndex = 0;
  }

  const newCommands = cleanLines.slice(startIndex);

  return {
    commands: newCommands,
    lastProcessedLine: currentTotalLines
  };
}

function parseZshHistory(lines, lastProcessedTimestamp, lastProcessedLine) {
  const extendedPattern = /^: (\d+):\d+;(.*)$/;
  const cleanLines = lines.filter(line => line.trim().length > 0);
  const hasExtendedFormat = cleanLines.some(line => extendedPattern.test(line));

  /*
   * EXTENDED_HISTORY isn't enabled — no timestamps to work with,
   * so fall back to the same line-count strategy as bash
   */
  if (!hasExtendedFormat) {
    const currentTotalLines = cleanLines.length;
    let startIndex = lastProcessedLine;
    if (startIndex > currentTotalLines) {
      startIndex = 0;
    }

    return {
      commands: cleanLines.slice(startIndex),
      lastProcessedLine: currentTotalLines,
      lastImportedTimestamp: lastProcessedTimestamp
    };
  }

  const newCommands = [];
  let newestTimestamp = lastProcessedTimestamp;

  for (const line of cleanLines) {
    const match = line.match(extendedPattern);
    if (!match) {
      continue;
    }

    const timestamp = parseInt(match[1], 10);
    const command = match[2];

    if (timestamp >= lastProcessedTimestamp) {
      newCommands.push(command);
      if (timestamp > newestTimestamp) {
        newestTimestamp = timestamp;
      }
    }
  }

  return {
    commands: newCommands,
    lastImportedTimestamp: newestTimestamp,
    lastProcessedLine: cleanLines.length
  };
}

function parseFishHistory(lines, lastProcessedTimestamp) {
  const commands = [];
  let newestTimestamp = lastProcessedTimestamp;
  let currentCommand = null;

  for (const line of lines) {
    if (line.startsWith('- cmd: ')) {
      currentCommand = line.slice('- cmd: '.length);
    }
    else if (line.startsWith('  when: ') && currentCommand !== null) {
      const timestamp = parseInt(line.slice('  when: '.length), 10);

      if (timestamp >= lastProcessedTimestamp) {
        commands.push(currentCommand);
        if (timestamp > newestTimestamp) {
          newestTimestamp = timestamp;
        }
      }
      currentCommand = null;
    }
  }

  return {
    commands,
    lastImportedTimestamp: newestTimestamp
  };
}

module.exports = {
  getHistoryFilePath,
  parseBashHistory,
  parseZshHistory,
  parseFishHistory
};
