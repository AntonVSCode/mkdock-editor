class ImageViewer {
  constructor() {
    this.modal = null;
    this.images = [];
    this.currentIndex = 0;
    this.imageCache = {};
    this.currentPath = ''; // Текущий путь
    this.folders = [];    // Список папок
    
    // Явная привязка методов
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
  }

  async init() {
    try {
      await this.createModal(); 
      await this.loadImageList();
      this.setupGalleryButton();
      //console.log('ImageViewer initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      showNotification('Не удалось инициализировать галерею', 'error');
    }
  }

  async loadImageList() {
    try {
      const response = await fetch(`/editor/api/images-and-folders?folder=${encodeURIComponent(this.currentPath)}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      this.images = data.images || [];
      this.folders = data.folders || [];
      
      await this.showImageList();
      this.updateBreadcrumbs(this.currentPath);
    } catch (error) {
      console.error('Failed to load images:', error);
      showNotification('Не удалось загрузить содержимое галереи', 'error');
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
          <div class="header-left">
            <h2 class="image-viewer-title">Галерея изображений</h2>
            <button id="create-folder-btn" class="icon-btn" title="Создать папку">
              <i class="mdi mdi-folder-plus"></i>
            </button>
          </div>
          <button class="close-btn">&times;</button>
        </div>
        <div class="current-folder">
          <div class="gallery-breadcrumbs"></div>
          <!--<span class="folder-path">images/</span>-->
        </div>
        <div class="image-list-container" id="image-list-container">
          <div class="thumbnail-grid"></div>
        </div>
        <div class="image-controls">
          <button id="insert-btn" disabled>Вставить в документ</button>
          <button id="delete-btn" class="danger" disabled>Удалить изображение</button>
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

    document.getElementById('delete-btn').addEventListener('click', () => {
      this.deleteImage();
    });

    // Добавляем обработчик для кнопки создания папки
    document.getElementById('create-folder-btn').addEventListener('click', () => {
      this.createFolder();
    });

    resolve();
  });
}

async navigateToFolder(folderPath) {
  try {
    this.currentPath = folderPath;
    await this.loadImageList(); // Это загрузит новые данные
    this.updateBreadcrumbs(folderPath);
  } catch (error) {
    console.error('Error navigating to folder:', error);
    showNotification('Не удалось загрузить содержимое папки', 'error');
  }
}

// Метод для обновления состояния кнопок
updateButtonsState() {
  const insertBtn = document.getElementById('insert-btn');
  const deleteBtn = document.getElementById('delete-btn');
  
  if (this.currentIndex !== undefined && this.images.length > 0) {
    insertBtn.disabled = false;
    deleteBtn.disabled = false;
  } else {
    insertBtn.disabled = true;
    deleteBtn.disabled = true;
  }
}

// Метод для создания папки
async createFolder() {
  const folderName = prompt('Введите название папки:');
  if (!folderName) return;

  // Проверка имени папки
  if (!/^[a-zA-Z0-9а-яА-Я\-_ ]+$/i.test(folderName)) {
    showNotification('Имя папки содержит недопустимые символы', 'error');
    return;
  }

  try {
    // Формируем относительный путь с учетом текущей папки
    const relativePath = this.currentPath ? 
      `${this.currentPath}/${folderName.trim()}` : 
      folderName.trim();

    const response = await fetch('/editor/api/directories', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        dirname: relativePath,
        context: 'images'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Не удалось создать папку');
    }

    showNotification(`Папка "${folderName}" создана`, 'success');
    await this.loadImageList();
    
  } catch (error) {
    console.error('Ошибка:', error);
    showNotification(`Ошибка: ${error.message}`, 'error');
  }
}

// Метод для удаления изображения
async deleteImage() {
  if (this.currentIndex === undefined || !this.images[this.currentIndex]) {
    showNotification('Сначала выберите изображение', 'error');
    return false;
  }

  const image = this.images[this.currentIndex];
  if (!image || !image.storedName) {
    showNotification('Не удалось определить изображение', 'error');
    return false;
  }

  // Создаем модальное окно подтверждения
  const modal = document.createElement('div');
  modal.className = 'confirmation-modal';
  modal.innerHTML = `
    <div class="confirmation-content">
      <h3>Удалить изображение?</h3>
      <p>Вы уверены, что хотите удалить "${image.displayName}"?</p>
      <div class="confirmation-buttons">
        <button class="btn-secondary">Отмена</button>
        <button class="btn-danger">Удалить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Ожидаем решения пользователя
  return new Promise((resolve) => {
    modal.querySelector('.btn-secondary').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });
    
    modal.querySelector('.btn-danger').addEventListener('click', async () => {
      try {
        const response = await fetch(`/editor/api/images?name=${encodeURIComponent(image.storedName)}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Не удалось удалить изображение');

        this.images.splice(this.currentIndex, 1);
        this.currentIndex = Math.min(this.currentIndex, this.images.length - 1);
        await this.showImageList();
        showNotification('Изображение удалено', 'success');
        resolve(true);
      } catch (error) {
        console.error('Error deleting image:', error);
        showNotification(`Ошибка при удалении: ${error.message}`, 'error');
        resolve(false);
      } finally {
        modal.remove();
      }
    });
  });
}

async showImageList() {
  const container = document.getElementById('image-list-container');
  if (!container) return;

  if (this.images.length === 0 && this.folders.length === 0) {
    container.innerHTML = '<p>Папка пуста</p>';
    return;
  }
  
  // Проверка данных
  if ((!this.images || !Array.isArray(this.images)) && (!this.folders || !Array.isArray(this.folders))) {
    container.innerHTML = '<p>Ошибка: некорректные данные</p>';
    return;
  }

  if ((!this.images || this.images.length === 0) && (!this.folders || this.folders.length === 0)) {
    container.innerHTML = '<p>Нет доступных изображений или папок</p>';
    return;
  }

  try {
    // Показываем индикатор загрузки
    container.innerHTML = '<p>Загрузка...</p>';
    
    // Создаем контейнер для миниатюр
    const grid = document.createElement('div');
    grid.className = 'thumbnail-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
    grid.style.gap = '15px';
    grid.style.padding = '10px';
    
    // Сначала показываем папки
    if (this.folders && this.folders.length > 0) {
      this.folders.forEach(folder => {
        const folderCard = this.createFolderCard(folder);
        grid.appendChild(folderCard);
      });
    }
    
    // Затем показываем изображения
    if (this.images && this.images.length > 0) {
      await Promise.all(this.images.map(async (image, index) => {
        const imageCard = this.createImageCard(image, index);
        grid.appendChild(imageCard);
      }));
    }
    
    container.innerHTML = '';
    container.appendChild(grid);
    
  } catch (error) {
    container.innerHTML = '<p>Ошибка при загрузке содержимого</p>';
  }
}

createFolderCard(folder) {
  const card = document.createElement('div');
  card.className = 'thumbnail-card folder-card';
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
  
  const preview = document.createElement('div');
  preview.style.height = '100px';
  preview.style.display = 'flex';
  preview.style.alignItems = 'center';
  preview.style.justifyContent = 'center';
  preview.style.backgroundColor = '#f5f5f5';
  preview.style.borderRadius = '3px';
  preview.style.overflow = 'hidden';
  
  const icon = document.createElement('i');
  icon.className = 'mdi mdi-folder';
  icon.style.fontSize = '50px';
  icon.style.color = '#ffb74d';
  
  const name = document.createElement('div');
  name.className = 'thumbnail-name';
  name.textContent = folder.name;
  name.style.marginTop = '8px';
  name.style.fontSize = '14px';
  name.style.whiteSpace = 'nowrap';
  name.style.overflow = 'hidden';
  name.style.textOverflow = 'ellipsis';
  
  preview.appendChild(icon);
  card.appendChild(preview);
  card.appendChild(name);
  
  card.addEventListener('click', () => {
    this.navigateToFolder(folder.path);
  });
  
  return card;
}

createImageCard(image, index) {
  const card = document.createElement('div');
  card.className = 'thumbnail-card image-card';
  card.dataset.index = index;
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
    
    // Убираем выделение у всех карточек
    document.querySelectorAll('.image-card').forEach(c => {
      c.classList.remove('selected');
    });
    
    // Выделяем текущую карточку
    card.classList.add('selected');
    
    // Запоминаем выбранное изображение
    this.currentIndex = index;
    
    // Обновляем состояние кнопок
    this.updateButtonsState();
  });
  
  return card;
}

// Хлебные крошки
// updateBreadcrumbs(currentPath) {
//   if (!this.modal) return; // Добавьте эту проверку

//   const breadcrumbsContainer = this.modal.querySelector('.gallery-breadcrumbs');
//   if (!breadcrumbsContainer) return;
  
//   const parts = currentPath.split('/').filter(Boolean);
//   let pathSoFar = '';
  
//   breadcrumbsContainer.innerHTML = '';
  
//   // Добавляем корневую папку
//   const rootCrumb = document.createElement('span');
//   rootCrumb.className = 'gallery-crumb';
//   rootCrumb.innerHTML = '<i class="mdi mdi-folder"></i> images';
//   rootCrumb.addEventListener('click', () => {
//     this.navigateToFolder('');
//     //document.querySelector('.folder-path').textContent = 'images/';
//   });
//   breadcrumbsContainer.appendChild(rootCrumb);
  
//   // Добавляем остальные части пути
//   parts.forEach(part => {
//     pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
    
//     const separator = document.createElement('span');
//     separator.className = 'gallery-separator';
//     separator.textContent = '/';
//     breadcrumbsContainer.appendChild(separator);
    
//     const crumb = document.createElement('span');
//     crumb.className = 'gallery-crumb';
//     crumb.innerHTML = `<i class="mdi mdi-folder"></i> ${part}`;
//     crumb.addEventListener('click', () => {
//       this.navigateToFolder(pathSoFar);
//       document.querySelector('.folder-path').textContent = `images/${pathSoFar}`;
//     });
//     breadcrumbsContainer.appendChild(crumb);
//   });
// }

updateBreadcrumbs(currentPath) {
  if (!this.modal) return;

  const breadcrumbsContainer = this.modal.querySelector('.gallery-breadcrumbs');
  if (!breadcrumbsContainer) return;

  const parts = currentPath.split('/').filter(Boolean);
  let pathSoFar = '';

  breadcrumbsContainer.innerHTML = '';

  // Корневая папка "images"
  const rootCrumb = document.createElement('span');
  rootCrumb.className = 'gallery-crumb';
  rootCrumb.innerHTML = '<i class="mdi mdi-folder"></i> images';
  rootCrumb.addEventListener('click', () => {
    this.navigateToFolder('');
  });
  breadcrumbsContainer.appendChild(rootCrumb);

  // Остальные части пути
  parts.forEach(part => {
    pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;

    const separator = document.createElement('span');
    separator.className = 'gallery-separator';
    separator.textContent = '/';
    breadcrumbsContainer.appendChild(separator);

    const crumb = document.createElement('span');
    crumb.className = 'gallery-crumb';
    crumb.innerHTML = `<i class="mdi mdi-folder"></i> ${part}`;
    crumb.addEventListener('click', () => {
      this.navigateToFolder(pathSoFar);
    });
    breadcrumbsContainer.appendChild(crumb);
  });
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
    if (this.currentIndex === undefined || !this.images[this.currentIndex]) {
      showNotification('Сначала выберите изображение', 'error');
      return;
    }

    const image = this.images[this.currentIndex];
    const markdown = `![${image.displayName}](images/${image.storedName})`;
    
    if (typeof Editor !== 'undefined' && Editor.insertAtCursor) {
      Editor.insertAtCursor(markdown);
      this.hide();
    } else {
      showNotification('Редактор не доступен', 'error');
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