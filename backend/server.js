const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const fileManager = require('./fileManager');
const imageUpload = require('./imageUpload');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, '../frontend')));

// Функция для восстановления оригинального имени (добавьте в начало файла)
function restoreOriginalName(storedName) {
  // Если имя файла в формате UUID_originalname.ext
  const match = storedName.match(/^[\w-]{36}_(.+)$/);
  return match ? match[1] : storedName;
}

// Перенаправление с корня на редактор
app.get('/', (req, res) => {
  res.redirect('http://mkdocknew.northeurope.cloudapp.azure.com/editor');
});

// Проверка инициализации
async function initialize() {
  try {
    console.log('Initializing server...');
    console.log('MKDOCS_ROOT:', fileManager.MKDOCS_ROOT);
    console.log('DOCS_DIR:', fileManager.DOCS_DIR);

    const docsExists = await fileManager.pathExists(fileManager.DOCS_DIR);
    if (!docsExists) {
      console.log('Docs directory not found, creating...');
      await fs.promises.mkdir(fileManager.DOCS_DIR, { recursive: true });
      await fs.promises.writeFile(
        path.join(fileManager.DOCS_DIR, 'index.md'),
        '# Welcome\n\nThis is a new MkDocs project'
      );
    }

    console.log('Server initialized successfully');
    return true;
  } catch (err) {
    console.error('Initialization failed:', err);
    throw err;
  }
}

// API Routes

// Получение списка файлов
app.get('/editor/api/files', async (req, res) => {
  try {
    console.log('Received request for /editor/api/files');
    const files = await fileManager.listFiles();
    console.log(`Sending ${files.length} files`);
    res.json(files);
  } catch (err) {
    console.error('Error in /editor/api/files:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Создание нового файла
app.post('/editor/api/files', async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const normalizedPath = filename.split('/').filter(Boolean).join('/');
    const filePath = path.join(fileManager.DOCS_DIR, normalizedPath);
    
    if (await fileManager.pathExists(filePath)) {
      return res.status(400).json({ 
        error: 'File already exists',
        path: normalizedPath
      });
    }

    const dirname = path.dirname(filePath);
    if (!await fileManager.pathExists(dirname)) {
      await fs.promises.mkdir(dirname, { recursive: true });
    }

    await fileManager.writeFile(normalizedPath, content || '# New File\n\nStart editing here...');
    
    res.json({ 
      success: true, 
      path: normalizedPath 
    });
  } catch (err) {
    console.error('Error creating file:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Создание новой директории
app.post('/editor/api/directories', async (req, res) => {
  try {
    const { dirname } = req.body;
    console.log('Creating directory:', dirname);
    
    if (!dirname) {
      return res.status(400).json({ error: 'Directory name is required' });
    }

    const dirPath = path.join(fileManager.DOCS_DIR, dirname);
    
    if (await fileManager.pathExists(dirPath)) {
      return res.status(400).json({ error: 'Directory already exists' });
    }

    await fs.promises.mkdir(dirPath, { recursive: true });
    res.json({ success: true, path: dirname });
  } catch (err) {
    console.error('Error creating directory:', err);
    res.status(500).json({ error: err.message });
  }
});

// Чтение файла
app.get('/editor/api/file', async (req, res) => {
  try {
    const filePath = req.query.path;
    console.log('Fetching file:', filePath); // Добавим лог для отладки
    
    // Убедимся, что путь не содержит "Root/"
    const cleanPath = filePath.replace(/^Root\//, '');
    const fullPath = path.join(fileManager.DOCS_DIR, cleanPath);
    
    console.log('Full path:', fullPath); // Лог полного пути
    
    if (!await fileManager.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = await fs.promises.readFile(fullPath, 'utf8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ 
      error: 'Failed to read file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Сохранение файла
app.post('/editor/api/file', async (req, res) => {
  try {
    console.log('Writing file:', req.body.path);
    await fileManager.writeFile(req.body.path, req.body.content);
    res.json({ success: true });
  } catch (err) {
    console.error('Error writing file:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Удаление файла
app.delete('/editor/api/files', async (req, res) => {
  try {
    const filePath = req.query.path;
    console.log('Deleting file:', filePath);
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = path.join(fileManager.DOCS_DIR, filePath);
    
    // Проверяем, существует ли файл
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Удаляем файл
    await fs.promises.unlink(fullPath);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Загрузка изображений
app.post('/editor/api/upload', async (req, res) => {
  try {
    const { displayName, storedName, relativePath } = await imageUpload.handleUpload(req);
    
    // Кодируем только путь, оставляя отображаемое имя как есть
    const encodedPath = encodeURI(relativePath).replace(/'/g, "%27");
    
    res.json({
      success: true,
      markdown: `![${displayName}](${encodedPath})`,
      storedName,
      displayName
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: err.message,
      // Добавляем stack только в development
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Работа с навигацией
app.get('/editor/api/nav', async (req, res) => {
  try {
    console.log('Fetching navigation');
    const nav = await fileManager.getNavigation();
    res.json(nav);
  } catch (err) {
    console.error('Error fetching navigation:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.post('/editor/api/nav', async (req, res) => {
  try {
    console.log('Updating navigation');
    await fileManager.updateNavigation(req.body.nav);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating navigation:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});


// Маршрут для перезагрузки MkDocs
app.post('/api/reload-mkdocs', async (req, res) => {
  try {
    console.log('Reloading MkDocs service...');
    exec('sudo systemctl restart mkdocs', (error, stdout, stderr) => {
      if (error) {
        console.error('Error reloading MkDocs:', error);
        console.error('Stderr:', stderr);
        return res.status(500).json({
          error: 'Failed to reload MkDocs',
          details: stderr
        });
      }
      console.log('MkDocs reloaded successfully');
      res.json({
        success: true,
        output: stdout
      });
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Галерея изображений
app.get('/editor/api/images', async (req, res) => {
  try {
    const imagesDir = path.join(__dirname, '../mkdocs-project/docs/images');
    
    // Создаем папку, если не существует
    if (!fs.existsSync(imagesDir)) {
      await fs.promises.mkdir(imagesDir, { recursive: true });
      return res.json([]);
    }
    
    // Читаем файлы
    const files = await fs.promises.readdir(imagesDir);
    
    // Фильтруем только изображения
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const images = files
      .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => ({
        storedName: file,
        displayName: restoreOriginalName(file) // Используем функцию напрямую
      }));
    
    res.json(images);
  } catch (err) {
    console.error('IMAGE GALLERY ERROR:', err);
    res.status(500).json({ 
      error: 'Failed to load images',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// Перемещение файла
app.post('/editor/api/move-file', async (req, res) => {
    try {
        const { oldPath, newPath } = req.body;
        
        const fullOldPath = path.join(fileManager.DOCS_DIR, oldPath);
        const fullNewPath = path.join(fileManager.DOCS_DIR, newPath);
        
        // Проверяем существование исходного файла
        if (!await fileManager.pathExists(fullOldPath)) {
            return res.status(404).json({ 
                success: false,
                message: 'Source file not found'
            });
        }
        
        // Проверяем, не существует ли уже файл в целевой папке
        if (await fileManager.pathExists(fullNewPath)) {
            return res.status(400).json({ 
                success: false,
                message: 'File already exists in target location'
            });
        }
        
        // Создаем все необходимые папки
        await fs.promises.mkdir(path.dirname(fullNewPath), { recursive: true });
        
        // Перемещаем файл
        await fs.promises.rename(fullOldPath, fullNewPath);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error moving file:', err);
        res.status(500).json({ 
            success: false,
            message: err.message
        });
    }
});

// Проверка содержимого папки
app.get('/editor/api/folder-contents', async (req, res) => {
    try {
        const folderPath = req.query.path;
        const fullPath = path.join(fileManager.DOCS_DIR, folderPath);
        
        const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
        
        const result = {
            files: entries.filter(e => e.isFile()).map(e => e.name),
            folders: entries.filter(e => e.isDirectory()).map(e => e.name)
        };
        
        res.json(result);
    } catch (err) {
        console.error('Error checking folder:', err);
        res.status(500).json({ error: err.message });
    }
});

// Удаление папки с обработкой содержимого
app.post('/editor/api/delete-folder', async (req, res) => {
    try {
        const { folderPath, action, targetFolder } = req.body;
        const fullFolderPath = path.join(fileManager.DOCS_DIR, folderPath);
        const fullTargetPath = targetFolder ? path.join(fileManager.DOCS_DIR, targetFolder) : fileManager.DOCS_DIR;
        
        // Проверяем существование папки
        if (!await fileManager.pathExists(fullFolderPath)) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        
        if (action === 'move') {
            // Перемещаем содержимое
            const entries = await fs.promises.readdir(fullFolderPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const oldPath = path.join(fullFolderPath, entry.name);
                const newPath = path.join(fullTargetPath, entry.name);
                
                // Проверяем, не существует ли уже файл/папка в целевой папке
                if (await fileManager.pathExists(newPath)) {
                    throw new Error(`'${entry.name}' already exists in target location`);
                }
                
                await fs.promises.rename(oldPath, newPath);
            }
        }
        
        // Удаляем саму папку
        await fs.promises.rmdir(fullFolderPath);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting folder:', err);
        res.status(500).json({ error: err.message });
    }
});

// Удаление папки
app.delete('/editor/api/delete-folder', async (req, res) => {
    try {
        const folderPath = req.query.path;
        if (!folderPath) {
            return res.status(400).json({ 
                success: false,
                message: 'Не указан путь к папке'
            });
        }

        const fullPath = path.join(fileManager.DOCS_DIR, folderPath);
        
        // Проверяем существование папки
        try {
            await fs.promises.access(fullPath);
        } catch (err) {
            return res.status(404).json({ 
                success: false,
                message: 'Папка не найдена'
            });
        }

        // Проверяем, что это действительно папка
        const stat = await fs.promises.stat(fullPath);
        if (!stat.isDirectory()) {
            return res.status(400).json({ 
                success: false,
                message: 'Указанный путь не является папкой' 
            });
        }
        
        // Рекурсивно удаляем папку
        await fs.promises.rm(fullPath, { recursive: true, force: true });
        
        res.json({ 
            success: true,
            message: 'Папка успешно удалена'
        });
    } catch (err) {
        console.error('Error deleting folder:', err);
        
        let errorMessage = 'Не удалось удалить папку';
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            errorMessage = 'Нет прав для удаления папки';
        }
        
        res.status(500).json({ 
            success: false,
            message: errorMessage
        });
    }
});

app.use('/mkdocs-project/docs/images', express.static(
  path.join(__dirname, '../mkdocs-project/docs/images'),
  {
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
    }
  }
));

// Запуск сервера
async function startServer() {
  try {
    await initialize();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Serving docs from: ${fileManager.DOCS_DIR}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}


startServer();
