const fs = require('fs').promises;

async function readJson(file, def) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    await fs.mkdir(require('path').dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(def, null, 2));
    return def;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(require('path').dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

module.exports = { readJson, writeJson };
