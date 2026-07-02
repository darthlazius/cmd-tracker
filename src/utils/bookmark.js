const fs = require('node:fs');
const path = require('node:path');

const TRACKER_DIR = path.join(process.cwd(), '.tracker');
const META_FILE = path.join(TRACKER_DIR, 'meta.json');

function getDefaultBookmark() {
  return {
    last_processed_line: 0,
    last_imported_timestamp: 0
  };
}

function readBookmark() {
  if (!fs.existsSync(META_FILE)) {
    return getDefaultBookmark();
  }

  const fileContent = fs.readFileSync(META_FILE, 'utf-8');

  try {
    const parsed = JSON.parse(fileContent);
    return { ...getDefaultBookmark(), ...parsed };
  }
  catch {
    return getDefaultBookmark();
  }
}

function writeBookmark(data) {
  if (!fs.existsSync(TRACKER_DIR)) {
    fs.mkdirSync(TRACKER_DIR, { recursive: true });
  }

  const tmpFile = path.join(TRACKER_DIR, `meta.json.${process.pid}.tmp`);
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, META_FILE);
}

module.exports = {
  getDefaultBookmark,
  readBookmark,
  writeBookmark
};
