/*
 * storage.js
 *
 * This file handles everything related to FILE OPERATIONS
 * It saves commands, reads commands, and manages the .tracker folder
 *
 * Two files in Node.js help us work with files and folders:
 * fs   → File System → read, write, check if file exists
 * path → helps build file paths that work on ALL operating systems
 *        Windows: C:\Users\project\.tracker\commands.json
 *        Mac/Linux: /home/user/project/.tracker/commands.json
 *        path module handles this difference automatically
 */
const fs = require('fs');
const path = require('path');

/*
 * Import our categorize function from categorizer.js
 * We need it here to know WHICH category to save the command in
 */
const { categorize } = require('./categorizer');

/*
 * process.cwd() → Current Working Directory
 * This gives us the path of the folder where user ran the command
 *
 * Example:
 * User is in → C:\Adithya Naik\GitHub\my-linux-repo
 * process.cwd() → "C:\Adithya Naik\GitHub\my-linux-repo"
 *
 * This is VERY important — we want to save commands in THEIR repo
 * not in our package folder
 */
const TRACKER_DIR = path.join(process.cwd(), '.tracker');

/*
 * This is where all commands will be saved
 * .tracker/commands.json inside the user's repo
 */
const COMMANDS_FILE = path.join(TRACKER_DIR, 'commands.json');

/*
 * This is our default empty structure
 * When we create commands.json for the first time
 * it starts with all empty arrays
 *
 * We use a function so we always get a FRESH object
 * not the same object reused (important in JavaScript)
 */
function getDefaultStructure() {
  return {
    git: [],
    npm: [],
    docker: [],
    linux: [],
    node: [],
    angular: [],
    python: [],
    go: [],
    java: [],
    rust: [],
    dotnet: [],
    kubernetes: [],
    database: [],
    cloud: [],
    packagemanagers: [],
    testing: [],
    ai: [],
    others: [],
  };
}

/*
 * initStorage() — sets up the .tracker folder and commands.json
 *
 * This runs when user types: tracker init
 * It creates the .tracker folder and commands.json if they don't exist
 */
function initStorage() {

  /*
   * fs.existsSync() → checks if a folder/file EXISTS
   * Returns true if exists, false if not
   *
   * If .tracker folder doesn't exist → create it
   */
  if (!fs.existsSync(TRACKER_DIR)) {

    /*
     * fs.mkdirSync() → creates a folder
     * { recursive: true } → creates parent folders too if needed
     * Like "mkdir -p" in linux
     */
    fs.mkdirSync(TRACKER_DIR, { recursive: true });
    console.log('✅ Created .tracker folder');
  }

  /*
   * If commands.json doesn't exist → create it with default structure
   */
  if (!fs.existsSync(COMMANDS_FILE)) {

    /*
     * fs.writeFileSync() → creates and writes to a file
     * JSON.stringify() → converts JavaScript object to JSON string
     * null, 2 → makes the JSON nicely formatted with 2 spaces indent
     */
    fs.writeFileSync(
      COMMANDS_FILE,
      JSON.stringify(getDefaultStructure(), null, 2)
    );
    console.log('✅ Created .tracker/commands.json');
  }
}

/*
 * readCommands() — reads all saved commands from commands.json
 *
 * @returns {object} — the entire commands object with all categories
 */
function readCommands() {

  /*
   * If file doesn't exist yet — return empty structure
   * This prevents crashes if someone runs tracker list before tracker init
   */
  if (!fs.existsSync(COMMANDS_FILE)) {
    return getDefaultStructure();
  }

  /*
   * fs.readFileSync() → reads the file content as text
   * JSON.parse() → converts JSON text back to JavaScript object
   */
  const fileContent = fs.readFileSync(COMMANDS_FILE, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return { ...getDefaultStructure(), ...parsed };
}

/*
 * saveCommand() — saves a single command to commands.json
 *
 * @param {string} command — the terminal command to save
 * @returns {object} — { saved: true/false, category: "git" etc, reason: "why not saved" }
 */
function saveCommand(command) {

  /*
   * Safety check — don't save empty commands
   */
  if (!command || !command.trim()) {
    return { saved: false, reason: 'empty command' };
  }

  /*
   * Clean the command — remove extra spaces
   */
  const cleanCommand = command.trim();

  /*
   * Use our categorizer to find which category this command belongs to
   */
  const category = categorize(cleanCommand);

  /*
   * Read existing commands from file
   */
  const data = readCommands();

  /*
   * DUPLICATE CHECK
   *
   * .some() → loops through array and returns true if ANY item matches
   *
   * We check if this exact command already exists in this category
   * If it does — don't save it again
   *
   * item.command → because each saved command is an object like:
   * { command: "git status", time: "2026-05-06T..." }
   */
  const isDuplicate = data[category].some(
    (item) => item.command === cleanCommand
  );

  if (isDuplicate) {
    return { saved: false, reason: 'duplicate', category };
  }

  /*
   * Create the command object with timestamp
   * new Date().toISOString() → "2026-05-06T10:30:00.000Z"
   * This gives us a full date+time in standard format
   */
  const commandObject = {
    command: cleanCommand,
    time: new Date().toISOString(),
  };

  /*
   * Push the new command into the correct category array
   */
  data[category].push(commandObject);

  /*
   * Write the updated data back to commands.json
   */
  fs.writeFileSync(COMMANDS_FILE, JSON.stringify(data, null, 2));

  return { saved: true, category };
}

/*
 * saveCommands() — bulk version of saveCommand() for importing many
 * commands at once (e.g. `tracker import`)
 *
 * saveCommand() reads + rewrites the whole file on every call, which is
 * fine for a single `tracker save` but becomes O(n) file I/O for n
 * commands when called in a loop. This reads once, applies every
 * command in memory, and writes once.
 *
 * @param {string[]} commands — terminal commands to save
 * @returns {object} — { savedCount, duplicateCount }
 */
function saveCommands(commands) {
  const data = readCommands();
  let savedCount = 0;
  let duplicateCount = 0;

  for (const command of commands) {
    if (!command || !command.trim()) {
      continue;
    }

    const cleanCommand = command.trim();
    const category = categorize(cleanCommand);

    const isDuplicate = data[category].some(
      (item) => item.command === cleanCommand
    );

    if (isDuplicate) {
      duplicateCount++;
      continue;
    }

    data[category].push({
      command: cleanCommand,
      time: new Date().toISOString(),
    });
    savedCount++;
  }

  if (savedCount > 0) {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(data, null, 2));
  }

  return { savedCount, duplicateCount };
}

/*
 * toggleFavorite() — marks/unmarks a command as favorite
 *
 * @param {string} command — the command to favorite
 * @returns {object} — { success, action: "added"/"removed", command }
 */
function toggleFavorite(command) {

  if (!command || !command.trim()) {
    return { success: false, reason: 'empty command' };
  }

  const cleanCommand = command.trim();
  const data = readCommands();

  /*
   * Search for command across all categories
   */
  for (const [category, commands] of Object.entries(data)) {
    const index = commands.findIndex(
      (item) => item.command === cleanCommand
    );

    if (index !== -1) {
      /*
       * Toggle favorite flag
       * If favorite exists and is true → set false
       * If favorite doesn't exist or false → set true
       */
      const currentFav = data[category][index].favorite || false;
      data[category][index].favorite = !currentFav;

      fs.writeFileSync(COMMANDS_FILE, JSON.stringify(data, null, 2));

      return {
        success: true,
        action: currentFav ? 'removed' : 'added',
        command: cleanCommand,
        category
      };
    }
  }

  return { success: false, reason: 'command not found' };
}

/*
 * getFavorites() — returns all favorited commands
 *
 * @returns {array} — array of { command, category, time }
 */
function getFavorites() {

  const data = readCommands();
  const favorites = [];

  for (const [category, commands] of Object.entries(data)) {
    for (const item of commands) {
      if (item.favorite === true) {
        favorites.push({
          command: item.command,
          category,
          time: item.time
        });
      }
    }
  }

  return favorites;
}



/*
 * module.exports → expose these functions to other files
 * Only export what other files need to use
 */
module.exports = {
  initStorage,
  readCommands,
  saveCommand,
  saveCommands,
  toggleFavorite,
  getFavorites,
  TRACKER_DIR,
  COMMANDS_FILE,
};
