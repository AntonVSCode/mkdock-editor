const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const archiver = require('archiver');

// Маршруты для фавикона
router.get('/check-favicon', (req, res) => {
  const faviconPath = path.join(__dirname, '../../frontend/assets/favicon.ico');
  res.json({ exists: fs.existsSync(faviconPath) });
});

router.post('/upload-favicon', upload.single('favicon'), (req, res) => {
  try {
    const assetsDir = path.join(__dirname, '../../frontend/assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    const tempPath = req.file.path;
    const targetPath = path.join(assetsDir, 'favicon.ico');
    
    fs.renameSync(tempPath, targetPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/favicon', (req, res) => {
  try {
    const faviconPath = path.join(__dirname, '../../frontend/assets/favicon.ico');
    if (fs.existsSync(faviconPath)) {
      fs.unlinkSync(faviconPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Маршруты для бэкапов
router.get('/backups', async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '../../backups');
    
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
    res.status(500).json({ error: err.message });
  }
});

router.post('/backups', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.zip`;
    const backupPath = path.join(__dirname, '../../backups', backupName);
    
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.directory(path.join(__dirname, '../../mkdocs-project'), 'mkdocs-project');
    await archive.finalize();
    
    res.json({ success: true, backup: backupName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/backups/download', (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const filePath = path.join(__dirname, '../../backups', name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/backups', (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const filePath = path.join(__dirname, '../../backups', name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;