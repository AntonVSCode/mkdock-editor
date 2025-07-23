const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sizeOf = require('image-size');

const IMAGE_DIR = path.join(__dirname, '../mkdocs-project/docs/images');
const META_DIR = path.join(IMAGE_DIR, 'images_meta');

async function handleUpload(req, targetFolder = '') {
  if (!req.files?.image) throw new Error('No file uploaded');

  const image = req.files.image;
  const originalName = Buffer.from(image.name, 'binary').toString('utf8');
  const fileExt = path.extname(originalName);
  const uniqueName = `${uuidv4()}${fileExt}`;
  
  // Формируем путь с учетом целевой папки
  const uploadPath = path.join(IMAGE_DIR, targetFolder, uniqueName);
  
  await fs.mkdir(path.dirname(uploadPath), { recursive: true });
  await image.mv(uploadPath);

  // Получаем размеры изображения
  let dimensions = { width: 0, height: 0 };
  try {
    dimensions = sizeOf(uploadPath);
  } catch (err) {
    console.error('Error getting image dimensions:', err);
  }

  // Получаем статистику файла
  const stats = await fs.stat(uploadPath);

  const newImageMeta = {
    originalName,
    storedName: uniqueName,
    path: targetFolder ? `images/${targetFolder}/${uniqueName}` : `images/${uniqueName}`,
    size: stats.size,
    uploadDate: new Date().toISOString(),
    dimensions
  };

  // Сохраняем метаданные
  await saveImageMeta(newImageMeta);

  return newImageMeta;
}

async function saveImageMeta(meta) {
  // Создаем папку если нет
  await fs.mkdir(META_DIR, { recursive: true });
  
  // 1. Сохраняем в файл по первой букве имени
  const firstChar = meta.originalName[0].toLowerCase();
  const charDir = path.join(META_DIR, 'by_char');
  await fs.mkdir(charDir, { recursive: true });
  
  const charFile = path.join(charDir, `${firstChar}.json`);
  await appendToJson(charFile, meta.storedName, meta);
  
  // 2. Сохраняем по дате
  const date = new Date(meta.uploadDate);
  const dateDir = path.join(META_DIR, 'by_date');
  await fs.mkdir(dateDir, { recursive: true });
  
  const dateFile = path.join(dateDir, `${date.getFullYear()}-${date.getMonth()+1}.json`);
  await appendToJson(dateFile, meta.storedName, meta);
  
  // 3. Обновляем главный индекс (только ID и основные поля)
  const indexFile = path.join(META_DIR, '_index.json');
  await appendToJson(indexFile, meta.storedName, {
    id: meta.storedName,
    originalName: meta.originalName,
    path: meta.path,
    uploadDate: meta.uploadDate
  });
}

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

module.exports = {
  handleUpload,
  saveImageMeta
};

// const path = require('path');
// const fs = require('fs').promises;
// const { v4: uuidv4 } = require('uuid');

// const IMAGE_DIR = path.join(__dirname, '../mkdocs-project/docs/images');
// const META_DIR = path.join(IMAGE_DIR, 'images_meta');

// async function handleUpload(req, targetFolder = '') {
//   if (!req.files?.image) throw new Error('No file uploaded');

//   const image = req.files.image;
//   const originalName = Buffer.from(image.name, 'latin1').toString('utf8');
//   const fileExt = path.extname(originalName);
//   const uniqueName = `${uuidv4()}${fileExt}`;
  
//   // Формируем путь с учетом целевой папки
//   const targetPath = targetFolder ? path.join(targetFolder) : '';
//   const uploadPath = path.join(IMAGE_DIR, targetPath, uniqueName);
  
//   await fs.mkdir(path.dirname(uploadPath), { recursive: true });
//   await image.mv(uploadPath);

//   const newImageMeta = {
//     originalName,
//     storedName: uniqueName,
//     path: targetPath ? `images/${targetPath}/${uniqueName}` : `images/${uniqueName}`,
//     size: image.size,
//     uploadDate: new Date().toISOString(),
//     dimensions: await getImageDimensions(image.tempFilePath)
//   };

//   // Сохраняем метаданные в новой структуре
//   await saveImageMeta(newImageMeta);

//   return newImageMeta;
// }

// async function getImageDimensions(filePath) {
//   try {
//     const sizeOf = require('image-size');
//     const dimensions = sizeOf(filePath);
//     return { width: dimensions.width, height: dimensions.height };
//   } catch (err) {
//     console.error('Error getting image dimensions:', err);
//     return { width: 0, height: 0 };
//   }
// }

// async function saveImageMeta(meta) {
//   // Создаем папку если нет
//   await fs.mkdir(META_DIR, { recursive: true });
  
//   // 1. Сохраняем в файл по первой букве имени
//   const firstChar = meta.originalName[0].toLowerCase();
//   const charDir = path.join(META_DIR, 'by_char');
//   await fs.mkdir(charDir, { recursive: true });
  
//   const charFile = path.join(charDir, `${firstChar}.json`);
//   await appendToJson(charFile, meta.storedName, meta);
  
//   // 2. Сохраняем по дате
//   const date = new Date(meta.uploadDate);
//   const dateDir = path.join(META_DIR, 'by_date');
//   await fs.mkdir(dateDir, { recursive: true });
  
//   const dateFile = path.join(dateDir, `${date.getFullYear()}-${date.getMonth()+1}.json`);
//   await appendToJson(dateFile, meta.storedName, meta);
  
//   // 3. Обновляем главный индекс (только ID и основные поля)
//   const indexFile = path.join(META_DIR, '_index.json');
//   await appendToJson(indexFile, meta.storedName, {
//     id: meta.storedName,
//     originalName: meta.originalName,
//     path: meta.path,
//     uploadDate: meta.uploadDate
//   });
// }

// async function appendToJson(filePath, key, data) {
//   let content = {};
//   try {
//     content = JSON.parse(await fs.readFile(filePath, 'utf8'));
//   } catch (e) {
//     // Файл не существует - это нормально для первого запуска
//   }
  
//   content[key] = data;
//   await fs.writeFile(filePath, JSON.stringify(content, null, 2));
// }

// module.exports = {
//   handleUpload
// };

// const path = require('path');
// const fs = require('fs').promises;
// const { v4: uuidv4 } = require('uuid');
// const IMAGE_DIR = path.join(__dirname, '../mkdocs-project/docs/images');
// const META_FILE = path.join(IMAGE_DIR, 'images_meta.json');

// async function handleUpload(req, targetFolder = '') {
//   if (!req.files?.image) throw new Error('No file uploaded');

//   const image = req.files.image;
//   const originalName = Buffer.from(image.name, 'latin1').toString('utf8');
//   const fileExt = path.extname(originalName);
//   const uniqueName = `${uuidv4()}${fileExt}`;
  
//   // Формируем путь с учетом целевой папки
//   const targetPath = targetFolder ? path.join(targetFolder) : '';
//   const uploadPath = path.join(IMAGE_DIR, targetPath, uniqueName);
  
//   await fs.mkdir(path.dirname(uploadPath), { recursive: true });
//   await image.mv(uploadPath);

//   // Читаем и обновляем метаданные
//   let metaData = {};
//   try {
//     if (await fs.access(META_FILE).then(() => true).catch(() => false)) {
//       metaData = JSON.parse(await fs.readFile(META_FILE, 'utf8'));
//     }
//   } catch (err) {
//     console.error('Error reading meta file:', err);
//   }

//   const newImageMeta = {
//     originalName,
//     storedName: uniqueName,
//     path: targetPath ? `images/${targetPath}/${uniqueName}` : `images/${uniqueName}`,
//     size: image.size,
//     uploadDate: new Date().toISOString(),
//     dimensions: await getImageDimensions(image.tempFilePath)
//   };

//   metaData[uniqueName] = newImageMeta;
//   await fs.writeFile(META_FILE, JSON.stringify(metaData, null, 2));

//   return newImageMeta;
// }

// async function getImageDimensions(filePath) {
//   try {
//     const sizeOf = require('image-size');
//     const dimensions = sizeOf(filePath);
//     return { width: dimensions.width, height: dimensions.height };
//   } catch (err) {
//     console.error('Error getting image dimensions:', err);
//     return { width: 0, height: 0 };
//   }
// }

// module.exports = {
//   handleUpload
// };


/*
Самая cтарая версия
*/


// const path = require('path');
// const fs = require('fs').promises;
// const { v4: uuidv4 } = require('uuid');

// // Изменил путь с public/uploads на docs/images
// const IMAGE_DIR = path.join(__dirname, '../mkdocs-project/docs/images');

// // Функция для обработки загрузки изображения
// async function handleUpload(req) {
//   if (!req.files?.image) throw new Error('No file uploaded');

//   const image = req.files.image;
  
//   // Сохраняем оригинальное имя с правильной кодировкой
//   const originalName = Buffer.from(image.name, 'latin1').toString('utf8');
//   const fileExt = path.extname(originalName);
//   const uniqueName = `${uuidv4()}${fileExt}`;
//   const uploadPath = path.join(IMAGE_DIR, uniqueName);

//   await fs.mkdir(IMAGE_DIR, { recursive: true });
//   await image.mv(uploadPath);

//   return {
//     displayName: originalName,
//     storedName: uniqueName,
//     relativePath: `images/${uniqueName}`
//   };
// }

// module.exports = {
//   handleUpload
// };
