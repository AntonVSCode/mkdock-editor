const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Изменил путь с public/uploads на docs/images
const IMAGE_DIR = path.join(__dirname, '../mkdocs-project/docs/images');

// Функция для обработки загрузки изображения
async function handleUpload(req) {
  if (!req.files?.image) throw new Error('No file uploaded');

  const image = req.files.image;
  
  // Сохраняем оригинальное имя с правильной кодировкой
  const originalName = Buffer.from(image.name, 'latin1').toString('utf8');
  const fileExt = path.extname(originalName);
  const uniqueName = `${uuidv4()}${fileExt}`;
  const uploadPath = path.join(IMAGE_DIR, uniqueName);

  await fs.mkdir(IMAGE_DIR, { recursive: true });
  await image.mv(uploadPath);

  return {
    displayName: originalName,
    storedName: uniqueName,
    relativePath: `images/${uniqueName}`
  };
}

module.exports = {
  handleUpload
};
