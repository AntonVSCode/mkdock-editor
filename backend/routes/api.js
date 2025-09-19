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

module.exports = router;