class ImageViewer {
  constructor() {
    this.modal = null;
    this.images = [];
    this.currentIndex = 0;
    this.imageCache = {};
    
    // Явная привязка методов
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
  }

  async init() {
    try {
      await this.loadImageList();
      await this.createModal(); // Добавлен await
      this.setupGalleryButton();
      //console.log('ImageViewer initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
    }
  }


  async loadImageList() {
    try {
      //console.log('Fetching images from /editor/api/images');
      const response = await fetch('/editor/api/images', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      //console.log('Received data:', data);
      
      // Обрабатываем разные форматы ответа
      this.images = data.map(item => ({
        displayName: item.displayName || item.originalName || item.name || this.extractFileName(item.storedName || item.filename),
        storedName: item.storedName || item.filename || item.id
      }));
      
      //console.log('Processed images:', this.images);
      
    } catch (error) {
      //console.error('Failed to load images:', error);
      showNotification('Не удалось загрузить галерею изображений', 'error');
      this.images = [];
    }
  }

// Вспомогательный метод для извлечения имени файла
extractFileName(fullPath) {
  if (!fullPath) return 'Untitled';
  return fullPath.split('/').pop().split('.').slice(0, -1).join('.') || 'Untitled';
}

  async preloadImage(index) {
    const image = this.images[index];
    const imgUrl = `${window.location.origin}/images/${image.storedName}`;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgUrl;
      img.onload = () => {
        this.imageCache[index] = img;
        resolve();
      };
      img.onerror = () => {
        console.error('Preload failed:', imgUrl);
        resolve();
      };
    });
  }

  showErrorMessage(message) {
    document.querySelectorAll('.image-gallery-error').forEach(el => el.remove());
    
    const errorElement = document.createElement('div');
    errorElement.className = 'image-gallery-error';
    errorElement.innerHTML = `
      <span>${message}</span>
      <button class="retry-btn">Повторить</button>
    `;
    document.body.appendChild(errorElement);
    
    errorElement.querySelector('.retry-btn').addEventListener('click', () => {
      errorElement.remove();
      this.loadImageList();
    });
    
    setTimeout(() => errorElement.remove(), 5000);
  }

createModal() {
  return new Promise((resolve) => {
    // Проверка на существование модального окна
    if (this.modal && document.body.contains(this.modal)) {
      //console.log('Modal already exists');
      resolve();
      return;
    }

    //console.log('Creating new modal');
    this.modal = document.createElement('div');
    this.modal.className = 'image-viewer-modal'; // Только класс, без inline-стилей
    this.modal.innerHTML = `
          <div class="image-viewer-content">
            <div class="image-viewer-header">
              <h2 class="image-viewer-title">Галерея изображений</h2>
              <button class="close-btn">&times;</button>
            </div>
            <div class="image-list-container" id="image-list-container">
              <div class="thumbnail-grid"></div>
            </div>
            <div class="image-controls">
              <button id="insert-btn">Вставить в документ</button>
            </div>
          </div>
    `;

    document.body.appendChild(this.modal);
    //console.log('Modal added to DOM');

    // Обработчики событий
    this.modal.querySelector('.close-btn').addEventListener('click', () => {
      //console.log('Close button clicked');
      this.hide();
    });
    
    document.getElementById('insert-btn').addEventListener('click', () => {
      //console.log('Insert button clicked');
      this.insertImage();
    });

    resolve();
  });
}

async showImageList() {
  const container = document.getElementById('image-list-container');
  
  if (!container) {
    //console.error('Image list container not found');
    return;
  }

  if (!this.images || !Array.isArray(this.images)) {
    container.innerHTML = '<p>Ошибка: некорректные данные изображений</p>';
    return;
  }

  if (this.images.length === 0) {
    container.innerHTML = '<p>Нет доступных изображений</p>';
    return;
  }

  try {
    // Показываем индикатор загрузки
    container.innerHTML = '<p>Загрузка превью...</p>';
    
    // Создаем контейнер для миниатюр
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
    grid.style.gap = '15px';
    grid.style.padding = '10px';
    
    // Загружаем каждое изображение
    await Promise.all(this.images.map(async (image, index) => {
      const card = document.createElement('div');
      card.style.border = '1px solid #ddd';
      card.style.borderRadius = '5px';
      card.style.padding = '8px';
      card.style.textAlign = 'center';
      card.style.cursor = 'pointer';
      card.style.transition = 'all 0.2s';
      
      card.addEventListener('mouseenter', () => {
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.boxShadow = 'none';
      });
      
      // Название изображения
      const name = document.createElement('div');
      name.textContent = image.displayName || image.originalName || `Изображение ${index + 1}`;
      name.style.marginTop = '8px';
      name.style.fontSize = '14px';
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      
      // Контейнер для превью
      const preview = document.createElement('div');
      preview.style.height = '100px';
      preview.style.display = 'flex';
      preview.style.alignItems = 'center';
      preview.style.justifyContent = 'center';
      preview.style.backgroundColor = '#f5f5f5';
      preview.style.borderRadius = '3px';
      preview.style.overflow = 'hidden';
      
      // Элемент изображения
      const img = document.createElement('img');
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      
      // Загружаем изображение
      try {
        const imgUrl = `${window.location.origin}/images/${image.storedName || image.filename}`;
        img.src = imgUrl;
        
        img.onerror = () => {
          // Заглушка если изображение не загрузилось
          preview.innerHTML = `
            <div style="color:#666; font-size:12px;">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#999">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <p>Не удалось загрузить</p>
            </div>
          `;
        };
      } catch (error) {
        console.error('Error loading preview:', error);
      }
      
      preview.appendChild(img);
      card.appendChild(preview);
      card.appendChild(name);
      
      // Обработчик клика
      card.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentIndex = index;
        this.insertImage();
      });
      
      grid.appendChild(card);
    }));
    
    container.innerHTML = '';
    container.appendChild(grid);
    
  } catch (error) {
    //console.error('Error rendering image list:', error);
    container.innerHTML = '<p>Ошибка при загрузке превью</p>';
  }
}

async show() {
  try {
    //console.log('Attempting to show modal');
    
    if (!this.modal) {
      //console.log('Modal not exists, creating...');
      await this.createModal();
    }

    //console.log('Showing modal');
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    await this.showImageList();
    //console.log('Image list shown');

  } catch (error) {
    //console.error('Error showing modal:', error);
    this.showErrorMessage('Не удалось открыть галерею');
  }
}

async showSelectedImage() {
  const image = this.images[this.currentIndex];
  
  // Обновляем информацию
  document.getElementById('original-name').textContent = 
    image.displayName || 'Не указано';
  document.getElementById('server-name').textContent = 
    image.storedName || 'Не указано';
  
  const imgElement = document.getElementById('viewed-image');
  const loadingElement = document.getElementById('image-loading');
  
  // Сбрасываем состояние
  imgElement.style.display = 'none';
  loadingElement.style.display = 'block';
  
  // Загружаем изображение
  imgElement.src = `${window.location.origin}/images/${image.storedName}`;
  
  imgElement.onload = () => {
    loadingElement.style.display = 'none';
    imgElement.style.display = 'block';
  };
  
  imgElement.onerror = () => {
    loadingElement.style.display = 'none';
    imgElement.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23eee"/><text x="200" y="150" font-family="Arial" font-size="16" text-anchor="middle" fill="%23000">Изображение не найдено</text></svg>';
    imgElement.style.display = 'block';
  };
}

hide() {
  if (this.modal) {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

  showNext() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.show(this.currentIndex);
    
    // Предзагрузка следующего изображения
    const nextIndex = (this.currentIndex + 1) % this.images.length;
    this.preloadImage(nextIndex);
  }

  showPrev() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.show(this.currentIndex);
    
    // Предзагрузка предыдущего изображения
    const prevIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.preloadImage(prevIndex);
  }

  insertImage() {
    const image = this.images[this.currentIndex];
    //const markdown = `![${image.displayName}](../images/${image.storedName})`;
    const markdown = `![${image.displayName}](images/${image.storedName})`;
    
    if (typeof Editor !== 'undefined' && Editor.insertAtCursor) {
      Editor.insertAtCursor(markdown);
      this.hide();
    } else {
      alert('Редактор не доступен');
    }
  }

setupGalleryButton() {
  const galleryBtn = document.getElementById('image-gallery-btn');
  if (!galleryBtn) {
    //console.error('Gallery button not found!');
    return;
  }

  //console.log('Setting up gallery button');
  galleryBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    //console.log('Gallery button clicked');
    await this.show();
  });
}

}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  window.imageViewer = new ImageViewer();
  window.imageViewer.init();
});