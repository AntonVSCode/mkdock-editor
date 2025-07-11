const fs = require('fs').promises;
const path = require('path');

// Явно задаем абсолютные пути
const MKDOCS_ROOT = path.resolve('/var/www/mkdocs-editor/mkdocs-project');
const DOCS_DIR = path.join(MKDOCS_ROOT, 'docs');

console.log('MKDOCS_ROOT:', MKDOCS_ROOT);
console.log('DOCS_DIR:', DOCS_DIR);

async function pathExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// Экспортируем константы для использования в server.js
module.exports = {
  MKDOCS_ROOT,
  DOCS_DIR,
  pathExists,
  
  listFiles: async function(dir = DOCS_DIR, baseDir = DOCS_DIR) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let files = [];

      for (const entry of entries) {
        // Пропускаем папку images
        if (entry.isDirectory() && entry.name === 'images') {
          continue;
        }
        
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: relativePath,
            isDirectory: true
          });
          
          const subFiles = await this.listFiles(fullPath, baseDir);
          files = files.concat(subFiles);
        } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
          files.push({
            name: entry.name,
            path: relativePath,
            isDirectory: false
          });
        }
      }

      return files;
    } catch (error) {
      console.error(`Error listing files in ${dir}:`, error);
      throw error;
    }
  },

  readFile: async function(filePath) {
    const fullPath = path.join(DOCS_DIR, filePath);
    return await fs.readFile(fullPath, 'utf8');
  },

  writeFile: async function(filePath, content) {
    const fullPath = path.join(DOCS_DIR, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    return await fs.writeFile(fullPath, content, 'utf8');
  }
};
