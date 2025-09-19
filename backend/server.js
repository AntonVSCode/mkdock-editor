const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const fileManager = require('./fileManager');
const imageUpload = require('./imageUpload');
const archiver = require('archiver');
const ASSETS_DIR = path.join(__dirname, '../mkdocs-project/docs/assets');
const { v4: uuidv4 } = require('uuid');

const MKDOCS_CONFIG_PATH = path.join(__dirname, '../mkdocs-project/mkdocs.yml');
const MKDOCS_DEFAULT_CONFIG_PATH = path.join(__dirname, '../mkdocs-project/mkdocs.default.yml');

// Создаем папки при старте сервера
const BACKUP_DIR = path.join(__dirname, '../backups');
const FRONTEND_ASSETS_DIR = path.join(__dirname, '../frontend/assets');

const app = express();
const PORT = 3000;
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);
app.use('/editor/api', apiRouter); // Дублирование для поддержки старых ссылок

// Middleware
app.use(express.json());
//app.use(fileUpload());
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB лимит
  useTempFiles: false // Работаем с файлами в памяти
}));
app.use(express.static(path.join(__dirname, '../frontend')));

// Создаем папки если их нет
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(FRONTEND_ASSETS_DIR)) {
  fs.mkdirSync(FRONTEND_ASSETS_DIR, { recursive: true });
}

// Функция для восстановления оригинального имени (добавьте в начало файла)
function restoreOriginalName(storedName) {
  // Если имя файла в формате UUID_originalname.ext
  const match = storedName.match(/^[\w-]{36}_(.+)$/);
  return match ? match[1] : storedName;
}

// Перенаправление с корня на редактор
// app.get('/', (req, res) => {
//   res.redirect('http://mkdocknew.northeurope.cloudapp.azure.com/editor');
// });

// Статические файлы
app.use('/assets', express.static(
  path.join(__dirname, '../frontend/assets'),
  { setHeaders: (res) => res.set('Access-Control-Allow-Origin', '*') }
));

app.use('/docs-assets', express.static(
  path.join(__dirname, '../mkdocs-project/docs/assets'),
  { setHeaders: (res) => res.set('Access-Control-Allow-Origin', '*') }
));

app.use('/images', express.static(
  path.join(__dirname, '../mkdocs-project/docs/images'),
  { setHeaders: (res) => res.set('Access-Control-Allow-Origin', '*') }
));


// Проверка инициализации
async function initialize() {
  try {
    console.log('Initializing server...');
    console.log('MKDOCS_ROOT:', fileManager.MKDOCS_ROOT);
    console.log('DOCS_DIR:', fileManager.DOCS_DIR);

    // 1. Проверка и создание папки docs
    const docsExists = await fileManager.pathExists(fileManager.DOCS_DIR);
    if (!docsExists) {
      console.log('Docs directory not found, creating...');
      await fs.promises.mkdir(fileManager.DOCS_DIR, { recursive: true });
      await fs.promises.writeFile(
        path.join(fileManager.DOCS_DIR, 'index.md'),
        '# Welcome\n\nThis is a new MkDocs project'
      );
      console.log('Created docs directory with index.md');
    }

    // 2. Проверка и создание mkdocs.yml
    if (!await fileManager.pathExists(MKDOCS_CONFIG_PATH)) {
      console.log('mkdocs.yml not found, creating default config...');
      const defaultConfig = `site_name: My Docs\nnav:\n  - Home: index.md\n`;
      await fs.promises.writeFile(MKDOCS_CONFIG_PATH, defaultConfig);
      console.log('Created default mkdocs.yml');
    }

    // 3. Проверка и создание mkdocs.default.yml (если не существует)
    if (!await fileManager.pathExists(MKDOCS_DEFAULT_CONFIG_PATH)) {
      console.log('mkdocs.default.yml not found, creating...');
      try {
        const currentConfig = await fs.promises.readFile(MKDOCS_CONFIG_PATH, 'utf8');
        await fs.promises.writeFile(MKDOCS_DEFAULT_CONFIG_PATH, currentConfig);
        console.log('Created mkdocs.default.yml from current config');
      } catch (error) {
        console.error('Failed to create default config:', error);
        // Создаем пустой файл, если не удалось прочитать текущий конфиг
        await fs.promises.writeFile(MKDOCS_DEFAULT_CONFIG_PATH, `site_name: My Docs\n`);
      }
    }

    // 4. Проверка папки images
    const imagesDir = path.join(fileManager.DOCS_DIR, 'images');
    if (!await fileManager.pathExists(imagesDir)) {
      console.log('Images directory not found, creating...');
      await fs.promises.mkdir(imagesDir, { recursive: true });
    }

    console.log('Server initialized successfully');
    return true;
  } catch (err) {
    console.error('Initialization failed:', err);
    throw err;
  }
}

// API Routes

app.use('/api', require('./routes/api')); // Можно вынести в отдельный файл

// Добавьте этот маршрут перед другими API маршрутами
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, '../frontend/assets/favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(404).end();
  }
});

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
    const subfolder = req.query.folder || '';
    const imagesDir = path.join(__dirname, '../mkdocs-project/docs/images', subfolder);
    
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

// Маршрут для создания папки в галерее и файловом менеджере
app.post('/editor/api/directories', async (req, res) => {
  try {
    const { dirname, context = 'files' } = req.body; // Добавляем параметр context
    
    if (!dirname) {
      return res.status(400).json({ error: 'Directory name is required' });
    }

    let basePath;
    if (context === 'images') {
      // Для галереи изображений - создаем в images
      basePath = path.join(__dirname, '../mkdocs-project/docs/images');
    } else {
      // Для файлового менеджера - создаем в корне docs
      basePath = path.join(__dirname, '../mkdocs-project/docs');
    }

    // Удаляем префикс images/, если он есть (на случай, если фронт его добавил)
    const normalizedDirname = dirname.replace(/^images\//, '');
    const dirPath = path.join(basePath, normalizedDirname);
    
    console.log('Attempting to create directory at:', dirPath);
    
    if (fs.existsSync(dirPath)) {
      return res.status(400).json({ error: 'Directory already exists' });
    }

    await fs.promises.mkdir(dirPath, { recursive: true });
    
    // Возвращаем правильный относительный путь в зависимости от контекста
    const returnPath = context === 'images' 
      ? `images/${normalizedDirname}` 
      : normalizedDirname;
    
    res.json({ 
      success: true, 
      path: returnPath,
      message: 'Directory created successfully'
    });
  } catch (err) {
    console.error('Error creating directory:', err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Проверка существования папки в галерея изображений
app.get('/editor/api/folder-exists', async (req, res) => {
  try {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'Path is required' });

    // Декодируем путь
    const decodedPath = decodeURIComponent(path);
    
    // Проверка безопасности пути
    if (decodedPath.includes('../') || decodedPath.includes('..\\')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Формируем полный путь (учитываем, что path уже содержит 'images/')
    const fullPath = path.join(__dirname, '../mkdocs-project/docs', decodedPath);
    
    try {
      const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
      res.json(exists);
    } catch (err) {
      console.error('Filesystem error:', err);
      res.status(500).json({ error: 'Filesystem operation failed' });
    }
  } catch (err) {
    console.error('Endpoint error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Удаление изображения из галереи
app.delete('/editor/api/images', async (req, res) => {
  try {
    const { name, folder = '' } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Image name is required' });
    }

    // Декодируем имя файла
    const decodedName = decodeURIComponent(name);
    
    // Проверяем безопасность пути
    if (decodedName.includes('../') || decodedName.includes('..\\')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    // Формируем полный путь с учетом папки
    const imagePath = path.join(
      __dirname, 
      '../mkdocs-project/docs/images', 
      folder, 
      decodedName
    );
    
    // Проверяем существование файла
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Проверяем, что это файл
    const stat = await fs.promises.stat(imagePath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    // Удаляем файл
    await fs.promises.unlink(imagePath);
    
    // Удаляем метаданные (если есть)
    const metaPath = path.join(__dirname, '../mkdocs-project/docs/images/images_meta/_index.json');
    if (fs.existsSync(metaPath)) {
      const metaData = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
      const imageKey = Object.keys(metaData).find(key => 
        key.endsWith(path.basename(decodedName))
      );
      if (imageKey) {
        delete metaData[imageKey];
        await fs.promises.writeFile(metaPath, JSON.stringify(metaData, null, 2));
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Удаление метаданных изображения
app.delete('/editor/api/images-meta/:name', async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: 'Image name is required' });
    }

    const metaPath = path.join(__dirname, '../mkdocs-project/docs/images/images_meta/_index.json');
    
    // Читаем текущие метаданные
    let metaData = {};
    try {
      metaData = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
    } catch (err) {
      console.error('Error reading meta file:', err);
      return res.status(404).json({ error: 'Meta file not found' });
    }

    // Удаляем запись о изображении
    if (metaData[name]) {
      delete metaData[name];
      await fs.promises.writeFile(metaPath, JSON.stringify(metaData, null, 2));
      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Image meta not found' });
  } catch (err) {
    console.error('Error deleting image meta:', err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});


// маршрут получения изображений
app.get('/editor/api/images-and-folders', async (req, res) => {
  try {
    const folder = req.query.folder || '';
    const fullPath = path.join(__dirname, '../mkdocs-project/docs/images', folder);
    
    // Создаем папку если не существует
    await fs.promises.mkdir(fullPath, { recursive: true });
    
    // Читаем содержимое
    const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
    
    // Читаем метаданные
    const metaPath = path.join(__dirname, '../mkdocs-project/docs/images/_meta/images.json');
    let allMeta = {};
    
    try {
      if (await fs.promises.access(metaPath).then(() => true).catch(() => false)) {
        allMeta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading meta:', err);
    }
    
    const result = {
      images: [],
      folders: []
    };
    
    // Фильтруем изображения и папки
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        result.folders.push({
          name: entry.name,
          path: path.join(folder, entry.name)
        });
      } else if (entry.isFile() && imageExtensions.includes(path.extname(entry.name).toLowerCase())) {
        const storedName = path.join(folder, entry.name);
        const meta = allMeta[storedName] || {
          displayName: entry.name,
          storedName,
          originalName: entry.name
        };
        result.images.push(meta);
      }
    }
    
    res.json(result);
    
  } catch (err) {
    console.error('Error loading folder content:', err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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

app.use('/assets', express.static(
  path.join(__dirname, '../mkdocs-project/docs/assets'),
  { setHeaders: (res) => res.set('Access-Control-Allow-Origin', '*') }
));

// Маршруты для загрузки favicon и логотипа в тему mkdocs
app.post('/editor/api/upload-favicon', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const image = req.files.image;
    const uploadPath = path.join(ASSETS_DIR, 'favicon.ico');

    // Создаём папку assets, если её нет
    if (!fs.existsSync(ASSETS_DIR)) {
      await fs.promises.mkdir(ASSETS_DIR, { recursive: true });
    }

    await image.mv(uploadPath);
    res.json({ success: true, filename: 'favicon.ico' });
  } catch (err) {
    console.error('Favicon upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/editor/api/upload-logo', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const image = req.files.image;
    const ext = path.extname(image.name).toLowerCase();

    // Разрешаем только PNG
    if (ext !== '.png') {
      return res.status(400).json({ error: 'Only PNG files are allowed' });
    }

    const uploadPath = path.join(ASSETS_DIR, 'logo.png');

    // Создаём папку assets, если её нет
    if (!fs.existsSync(ASSETS_DIR)) {
      await fs.promises.mkdir(ASSETS_DIR, { recursive: true });
    }

    // Удаляем старый логотип, если он есть
    const oldLogoPath = path.join(ASSETS_DIR, 'logo.png');
    if (fs.existsSync(oldLogoPath)) {
      await fs.promises.unlink(oldLogoPath);
    }

    await image.mv(uploadPath);
    res.json({ success: true, filename: 'logo.png' });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== МАРШРУТЫ ДЛЯ БЭКАПОВ ====================

// Получение списка бэкапов
app.get('/editor/api/backups', async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '../backups');
    
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
      return res.json([]);
    }
    
    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.zip'))
      .map(file => {
        const stats = fs.statSync(path.join(backupsDir, file));
        return {
          name: file,
          size: stats.size,
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date - a.date);
    
    res.json(files);
  } catch (err) {
    console.error('Error getting backups:', err);
    res.status(500).json({ error: err.message });
  }
});

// Создание бэкапа (ИСКЛЮЧАЕМ ПАПКУ SITE)
app.post('/editor/api/backups', async (req, res) => {
  console.log('=== START BACKUP CREATION ===');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.zip`;
    const backupPath = path.join(__dirname, '../backups', backupName);
    
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    
    // Исключаем папку site из архива
    archive.glob('**/*', {
      cwd: path.join(__dirname, '../mkdocs-project'),
      ignore: ['site/**', 'site/**/*'] // ← ВАЖНО: исключаем папку site
    }, { prefix: 'mkdocs-project' });
    
    await archive.finalize();
    
    console.log('✅ Backup created successfully:', backupName);
    
    res.json({ success: true, backup: backupName });
  } catch (err) {
    console.error('Backup creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Скачивание бэкапа
app.get('/editor/api/backups/download', (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const filePath = path.join(__dirname, '../backups', name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    res.download(filePath);
  } catch (err) {
    console.error('Error downloading backup:', err);
    res.status(500).json({ error: err.message });
  }
});

// Удаление бэкапа
app.delete('/editor/api/backups', (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const filePath = path.join(__dirname, '../backups', name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting backup:', err);
    res.status(500).json({ error: err.message });
  }
});

// Восстановление из бэкапа
app.post('/editor/api/backups/restore', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const backupPath = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    console.log('Restoring from backup:', name);
    const projectDir = path.join(__dirname, '../mkdocs-project');
    const tempDir = path.join(__dirname, '../temp-restore');

    try {
      // Создаем временную папку
      await fs.promises.mkdir(tempDir, { recursive: true });
      
      // Распаковываем архив во временную папку
      await new Promise((resolve, reject) => {
        exec(`unzip -o "${backupPath}" -d "${tempDir}"`, (error, stdout, stderr) => {
          if (error) {
            console.error('Unzip error:', error);
            console.error('Stderr:', stderr);
            reject(error);
          } else {
            console.log('Backup extracted successfully to temp directory');
            resolve();
          }
        });
      });

      // Проверяем структуру распакованных файлов
      const extractedItems = await fs.promises.readdir(tempDir);
      console.log('Extracted items:', extractedItems);

      // Находим папку mkdocs-project в распакованных файлах
      let sourceDir = tempDir;
      if (extractedItems.includes('mkdocs-project')) {
        sourceDir = path.join(tempDir, 'mkdocs-project');
      }

      // Копируем все файлы и папки в основной проект
      const itemsToCopy = await fs.promises.readdir(sourceDir);
      console.log('Items to copy:', itemsToCopy);

      for (const item of itemsToCopy) {
        // Пропускаем папку site, если она случайно попала в архив
        if (item === 'site') continue;
        
        const sourcePath = path.join(sourceDir, item);
        const targetPath = path.join(projectDir, item);
        
        try {
          // Удаляем старый файл/папку если существует (с обработкой ошибок прав)
          if (fs.existsSync(targetPath)) {
            // Пробуем изменить права перед удалением
            try {
              await fs.promises.chmod(targetPath, 0o755);
            } catch (chmodError) {
              console.warn(`Could not change permissions for ${targetPath}:`, chmodError.message);
            }
            
            await fs.promises.rm(targetPath, { recursive: true, force: true });
          }
          
          // Копируем новый
          await fs.promises.cp(sourcePath, targetPath, { recursive: true });
          console.log(`Copied: ${item}`);
          
        } catch (itemError) {
          console.error(`Error processing ${item}:`, itemError.message);
          // Пропускаем проблемный файл и продолжаем
          continue;
        }
      }

      // Очищаем временную папку
      await fs.promises.rm(tempDir, { recursive: true, force: true });

      res.json({ success: true, message: `Бэкап "${name}" восстановлен успешно. Перезагрузите страницу. F5` });

    } catch (err) {
      // Очищаем временную папку в случае ошибки
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
      throw err;
    }

  } catch (err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ 
      error: err.message,
      details: 'Check file permissions. Run: sudo chown -R $USER:$USER /var/www/mkdocs-editor/'
    });
  }
});

// ==================== КОНЕЦ МАРШРУТОВ ДЛЯ БЭКАПОВ ====================

// ==================== МАРШРУТЫ ДЛЯ ЗАГРУЗКИ И ВОССТАНОВЛЕНИЯ БЭКАПОВ ====================

// Загрузка бэкапа на сервер
app.post('/editor/api/backups/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.backup) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    const backupFile = req.files.backup;
    
    // Проверяем расширение файла
    if (!backupFile.name.endsWith('.zip')) {
      return res.status(400).json({ error: 'Only ZIP files are allowed' });
    }

    // Генерируем имя файла с timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `uploaded-backup-${timestamp}.zip`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Сохраняем файл
    await backupFile.mv(backupPath);

    console.log('Backup uploaded successfully:', backupName);

    res.json({
      success: true,
      backup: {
        name: backupName,
        size: backupFile.size,
        date: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('Backup upload error:', err);
    res.status(500).json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Восстановление из бэкапа (улучшенная версия с обработкой прав доступа)
app.post('/editor/api/backups/restore', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const backupPath = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    console.log('Restoring from backup:', name);
    const projectDir = path.join(__dirname, '../mkdocs-project');
    const tempDir = path.join(__dirname, '../temp-restore');

    try {
      // Создаем временную папку
      await fs.promises.mkdir(tempDir, { recursive: true });
      
      // Распаковываем архив во временную папку
      await new Promise((resolve, reject) => {
        exec(`unzip -o "${backupPath}" -d "${tempDir}"`, (error, stdout, stderr) => {
          if (error) {
            console.error('Unzip error:', error);
            console.error('Stderr:', stderr);
            reject(new Error(`Unzip failed: ${stderr || error.message}`));
          } else {
            console.log('Backup extracted successfully to temp directory');
            resolve();
          }
        });
      });

      // Проверяем структуру распакованных файлов
      const extractedItems = await fs.promises.readdir(tempDir);
      console.log('Extracted items:', extractedItems);

      // Находим папку mkdocs-project в распакованных файлах
      let sourceDir = tempDir;
      if (extractedItems.includes('mkdocs-project')) {
        sourceDir = path.join(tempDir, 'mkdocs-project');
        console.log('Using mkdocs-project directory from archive');
      } else {
        console.log('Using root directory of archive');
      }

      // Копируем все файлы и папки в основной проект
      const itemsToCopy = await fs.promises.readdir(sourceDir);
      console.log('Items to copy:', itemsToCopy);

      for (const item of itemsToCopy) {
        // Пропускаем папку site, если она случайно попала в архив
        if (item === 'site') {
          console.log('Skipping site directory');
          continue;
        }
        
        const sourcePath = path.join(sourceDir, item);
        const targetPath = path.join(projectDir, item);
        
        try {
          // Удаляем старый файл/папку если существует (с обработкой ошибок прав)
          if (fs.existsSync(targetPath)) {
            console.log(`Removing existing: ${item}`);
            
            // Пробуем изменить права перед удалением
            try {
              await fs.promises.chmod(targetPath, 0o755);
              console.log(`Changed permissions for: ${item}`);
            } catch (chmodError) {
              console.warn(`Could not change permissions for ${item}:`, chmodError.message);
            }
            
            // Рекурсивно удаляем
            await fs.promises.rm(targetPath, { recursive: true, force: true });
            console.log(`Removed: ${item}`);
          }
          
          // Копируем новый файл/папку
          console.log(`Copying: ${item}`);
          await fs.promises.cp(sourcePath, targetPath, { recursive: true });
          console.log(`Copied: ${item}`);
          
        } catch (itemError) {
          console.error(`Error processing ${item}:`, itemError.message);
          // Пропускаем проблемный файл и продолжаем
          continue;
        }
      }

      // Очищаем временную папку
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      console.log('Temp directory cleaned');

      console.log('Backup успешно восстановлен. Перезагрузите страницу. F5');

      // ОЧИЩАЕМ КЭШ ИЗБРАННОГО ПРИ ВОССТАНОВЛЕНИИ
      favoritesCache = null;
      cacheTimestamp = 0;

      res.json({ 
        success: true, 
        message: `Бэкап "${name}" восстановлен успешно. Страница перезагрузится через 3 секунды.`,
        backupName: name, // Добавляем имя архива в ответ
        reload: true // ← ДОБАВЛЯЕМ ФЛАГ ДЛЯ ПЕРЕЗАГРУЗКИ
      });

    } catch (err) {
      // Очищаем временную папку в случае ошибки
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
      throw err;
    }

  } catch (err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ 
      error: err.message,
      details: 'Check file permissions. Run: sudo chown -R $USER:$USER /var/www/mkdocs-editor/'
    });
  }
});

// Проверка возможности восстановления (предварительная проверка прав)
app.get('/editor/api/backups/check-restore', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const backupPath = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Проверяем права на запись в целевую директорию
    const projectDir = path.join(__dirname, '../mkdocs-project');
    try {
      // Пробуем создать тестовый файл
      const testFile = path.join(projectDir, '.test_write_permission');
      await fs.promises.writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
      
      res.json({ 
        canRestore: true,
        message: 'Write permissions are OK'
      });
    } catch (error) {
      res.json({ 
        canRestore: false,
        message: 'No write permissions. Check file ownership.',
        error: error.message
      });
    }

  } catch (err) {
    console.error('Error checking restore:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== КОНЕЦ МАРШРУТОВ ДЛЯ ЗАГРУЗКИ И ВОССТАНОВЛЕНИЯ ====================

app.get('/editor/api/files', async (req, res) => {
  try {
    const rootDir = req.query.root || '';
    let basePath = path.join(__dirname, '../mkdocs-project/docs');
    
    // Если указан root=docs, используем только папку docs
    // (это уже и так наша базовая папка, но оставляем для ясности)
    if (rootDir !== 'docs') {
      basePath = path.join(__dirname, '../mkdocs-project');
    }
    
    console.log('Fetching files from:', basePath);
    
    const files = [];
    async function traverse(dir, relativePath = '') {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Пропускаем скрытые файлы и системные папки
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'backups') {
          continue;
        }
        
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: relPath,
            isDirectory: true
          });
          await traverse(fullPath, relPath);
        } else {
          // Пропускаем временные файлы и ненужные расширения
          const ext = path.extname(entry.name).toLowerCase();
          if (['.tmp', '.log', '.DS_Store'].includes(ext)) {
            continue;
          }
          
          files.push({
            name: entry.name,
            path: relPath,
            isDirectory: false
          });
        }
      }
    }
    
    await traverse(basePath);
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

// Маршрут для загрузки в галерею
app.post('/editor/api/upload-to-gallery', async (req, res) => {
  try {
    if (!req.files?.image) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Получаем folder из тела запроса (может быть undefined или пустой строкой)
    const targetFolder = req.body.folder || '';
    const imagesDir = path.join(__dirname, '../mkdocs-project/docs/images');
    const fullPath = path.join(imagesDir, targetFolder);
    const image = req.files.image;

    // Создаем папку если не существует с улучшенной обработкой ошибок
    try {
      await fs.promises.mkdir(fullPath, { recursive: true });
      console.log(`Directory created/verified: ${fullPath}`);
    } catch (err) {
      console.error(`Error creating directory ${fullPath}:`, err);
      throw new Error('Failed to create target directory');
    }

    // Генерируем уникальное имя
    const originalName = image.name;
    const ext = path.extname(originalName);
    const uniqueName = `${uuidv4()}${ext}`;
    const targetPath = path.join(fullPath, uniqueName);

    // Логирование перед сохранением
    console.log(`Attempting to save to: ${targetPath}`);

    // Сохраняем файл
    await image.mv(targetPath);

    // Получаем метаданные
    const stats = await fs.promises.stat(targetPath);
    let dimensions = { width: 0, height: 0 };
    try {
      dimensions = sizeOf(targetPath);
    } catch (e) {
      console.error('Error getting dimensions:', e);
    }

    const meta = {
      originalName,
      storedName: uniqueName,
      path: targetFolder ? `images/${targetFolder}/${uniqueName}` : `images/${uniqueName}`,
      size: stats.size,
      uploadDate: new Date().toISOString(),
      dimensions
    };

    // Сохраняем метаданные
    await saveImageMeta(meta);

    res.json({
      success: true,
      meta
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

//////////////////////////////////////////////////
async function appendToJson(filePath, key, data) {
  let content = {};
  try {
    content = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (e) {
    // Файл не существует - это нормально для первого запуска
  }
  
  content[key] = data;
  await fs.writeFile(filePath, JSON.stringify(content, null, 2));
}

//\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
//\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
async function saveImageMeta(meta) {
  const META_DIR = path.join(__dirname, '../mkdocs-project/docs/images/images_meta');
  
  try {
    await fs.promises.mkdir(META_DIR, { recursive: true });
    
    const metaPath = path.join(META_DIR, '_index.json');
    let allMeta = {};
    
    try {
      const data = await fs.promises.readFile(metaPath, 'utf8');
      allMeta = JSON.parse(data);
    } catch (e) {
      console.log('Creating new meta file');
    }
    
    allMeta[meta.storedName] = meta;
    
    await fs.promises.writeFile(
      metaPath,
      JSON.stringify(allMeta, null, 2),
      'utf8'
    );
    
  } catch (err) {
    console.error('Error in saveImageMeta:', err);
    throw err;
  }
}

// Endpoint для получения метаданных
app.get('/editor/api/images-meta', async (req, res) => {
  const { folder = '', page = 1, limit = 50 } = req.query;
  
  try {
    const metaFile = path.join(__dirname, '../mkdocs-project/docs/images/images_meta/_index.json');
    
    let content = {};
    try {
      content = JSON.parse(await fs.promises.readFile(metaFile, 'utf8'));
    } catch (err) {
      console.error('Error reading meta file:', err);
      return res.json({ items: [], total: 0 });
    }
    
    // Фильтрация по папке
    let items = Object.values(content);
    if (folder) {
      items = items.filter(item => 
        item.path.startsWith(`images/${folder}/`) || 
        (folder === '' && !item.path.includes('/'))
      );
    }
    
    // Пагинация
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);
    
    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      total: items.length,
      items: paginatedItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


//
//
//
////////////////////////////////////////////////////
async function readJsonChunk(filePath, page, limit) {
  // Реализация потокового чтения JSON
  const start = (page - 1) * limit;
  const end = start + limit;
  
  return new Promise((resolve) => {
    const items = [];
    const stream = fs.createReadStream(filePath, { 
      encoding: 'utf8',
      start: findLineStart(filePath, start),
      end: findLineStart(filePath, end)
    });
    
    stream.on('data', (chunk) => {
      // Парсим только нужную часть
      const partial = `{${chunk.split('{').pop().split('}')[0]}}`;
      try {
        const data = JSON.parse(partial);
        items.push(...Object.values(data));
      } catch (e) {}
    });
    
    stream.on('end', () => resolve(items));
  });
}

// Маршрут для получения папок
app.get('/editor/api/folders', async (req, res) => {
  try {
    const folderPath = req.query.path || '';
    const fullPath = path.join(__dirname, '../mkdocs-project/docs/images', folderPath);
    
    await fs.promises.mkdir(fullPath, { recursive: true });
    
    const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
    
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: folderPath ? `${folderPath}/${entry.name}` : entry.name
      }));
    
    res.json(folders);
  } catch (err) {
    console.error('Error loading folders:', err);
    res.status(500).json({ error: err.message });
  }
});

// Простой тест для проверки работы API
app.get('/editor/api/debug', (req, res) => {
  fs.appendFileSync('/var/www/mkdocs-editor/backup.log', 
    `Debug API called at ${new Date().toISOString()}\n`);
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

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

// Получение конфига
app.get('/editor/api/mkdocs-config', async (req, res) => {
  try {
    const content = await fs.promises.readFile(
      path.join(__dirname, '../mkdocs-project/mkdocs.yml'), 
      'utf8'
    );
    res.type('yaml').send(content);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// Получение дефолтного конфига
app.get('/editor/api/mkdocs-default-config', async (req, res) => {
  try {
    const content = await fs.promises.readFile(
      path.join(__dirname, '../mkdocs-project/mkdocs.default.yml'),
      'utf8'
    );
    res.type('yaml').send(content);
  } catch (error) {
    console.error('Error reading default config:', error);
    res.status(500).json({ error: 'Failed to read default config' });
  }
});

// Сохранение конфига
app.post('/editor/api/mkdocs-config', async (req, res) => {
  try {
    await fs.promises.writeFile(
      path.join(__dirname, '../mkdocs-project/mkdocs.yml'),
      req.body.content,
      'utf8'
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// ↓↓↓ ДОБАВЛЯЕМ СЮДА КЭШИРОВАНИЕ ↓↓↓
let favoritesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 секунд

async function getFavoritesWithCache() {
  // Проверяем кэш
  const now = Date.now();
  if (favoritesCache && now - cacheTimestamp < CACHE_TTL) {
    return favoritesCache;
  }
  
  await ensureFavoritesFile();
  const data = await fs.promises.readFile(FAVORITES_FILE, 'utf8');
  favoritesCache = JSON.parse(data);
  cacheTimestamp = now;
  
  return favoritesCache;
}

async function saveFavoritesWithCache(favorites) {
  favoritesCache = favorites;
  cacheTimestamp = Date.now();
  await fs.promises.writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
}
// ↑↑↑ КОНЕЦ КЭШИРОВАНИЯ ↑↑↑

// Маршруты для избранных иконок
app.get('/editor/api/favorites', async (req, res) => {
  try {
    const favorites = await getFavoritesWithCache(); // ← Используем кэшированную версию
    res.json(favorites);
  } catch (err) {
    console.error('Error getting favorites:', err);
    res.status(500).json({ 
      error: 'Failed to load favorites',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post('/editor/api/favorites', async (req, res) => {
  try {
    const { iconName } = req.body;
    if (!iconName) {
      return res.status(400).json({ error: 'Icon name is required' });
    }

    await addToFavorites(iconName);
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(500).json({ 
      error: 'Failed to add favorite',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.delete('/editor/api/favorites/:iconName', async (req, res) => {
  try {
    const { iconName } = req.params;
    await removeFromFavorites(iconName);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing favorite:', err);
    res.status(500).json({ 
      error: 'Failed to remove favorite',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Функции для работы с файлом избранного
const FAVORITES_FILE = path.join(__dirname, 'data', 'favorites.json');

async function ensureFavoritesFile() {
  const dir = path.dirname(FAVORITES_FILE);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  
  if (!fs.existsSync(FAVORITES_FILE)) {
    await fs.promises.writeFile(FAVORITES_FILE, JSON.stringify([], null, 2));
  }
}

async function getFavorites() {
  await ensureFavoritesFile();
  const data = await fs.promises.readFile(FAVORITES_FILE, 'utf8');
  return JSON.parse(data);
}

async function saveFavorites(favorites) {
  await ensureFavoritesFile();
  await fs.promises.writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
}

async function addToFavorites(iconName) {
  const favorites = await getFavoritesWithCache(); // ← Используем кэшированную версию
  if (!favorites.includes(iconName)) {
    favorites.push(iconName);
    await saveFavoritesWithCache(favorites); // ← Используем кэшированную версию
  }
}

async function removeFromFavorites(iconName) {
  const favorites = await getFavoritesWithCache(); // ← Используем кэшированную версию
  const index = favorites.indexOf(iconName);
  if (index > -1) {
    favorites.splice(index, 1);
    await saveFavoritesWithCache(favorites); // ← Используем кэшированную версию
  }
}

startServer();
