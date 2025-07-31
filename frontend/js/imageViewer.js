class ImageViewer {
  constructor() {
    this.modal = null;
    this.images = [];
    this.currentIndex = 0;
    this.imageCache = {};
    this.currentPath = ''; // Текущий путь
    this.folders = [];    // Список папок
    this.currentPage = 1;
    this.loadedPages = new Set();
    this.metaCache = new Map();
    
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
      this.showSkeletons();
      
      // Загружаем изображения с пагинацией и фильтрацией по папке
      const imagesResponse = await fetch(
        `/editor/api/images-meta?folder=${encodeURIComponent(this.currentPath)}&page=${this.currentPage}`
      );
      
      if (!imagesResponse.ok) throw new Error(`Server error: ${imagesResponse.status}`);
      
      const imagesData = await imagesResponse.json();

      // Фильтруем изображения по текущей папке
      const filteredImages = (imagesData.items || []).filter(img => {
        const imgFolder = img.path.split('/').slice(0, -1).join('/');
        return imgFolder === `images/${this.currentPath}` || 
              (this.currentPath === '' && imgFolder === 'images');
      });
      
      // Для первой страницы заменяем, для последующих - добавляем
      if (this.currentPage === 1) {
        this.images = filteredImages;
      } else {
        this.images = [...this.images, ...filteredImages];
      }
      
      // Загружаем папки и исключаем images_meta
      const foldersResponse = await fetch(
        `/editor/api/folders?path=${encodeURIComponent(this.currentPath)}`
      );
      
      if (foldersResponse.ok) {
        this.folders = (await foldersResponse.json()).filter(folder => 
          folder.name !== 'images_meta'
        );
      } else {
        this.folders = [];
      }
      
      await this.showImageList();
      this.updateBreadcrumbs(this.currentPath);
      
      if (!this.loadedPages.has(this.currentPage)) {
        this.setupInfiniteScroll();
        this.loadedPages.add(this.currentPage);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      showNotification('Не удалось загрузить содержимое галереи', 'error');
    }
  }

  // Добавляем новые методы
  showSkeletons() {
    const container = document.querySelector('.thumbnail-grid');
    if (!container) return;
    
    const skeleton = `
      <div class="image-skeleton" style="height: 150px; background: #f0f0f0; border-radius: 5px;"></div>
    `.repeat(10);
    
    container.innerHTML += skeleton;
  }

  setupInfiniteScroll() {
    const container = document.getElementById('image-list-container');
    if (!container) return;
    
    container.onscroll = () => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        this.currentPage++;
        this.loadImageList();
      }
    };
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
    if (this.modal && document.body.contains(this.modal)) {
      resolve();
      return;
    }

    this.modal = document.createElement('div');
    this.modal.className = 'image-viewer-modal';
    this.modal.innerHTML = `
      <div class="image-viewer-content">
        <div class="image-viewer-header">
          <div class="header-left">
            <h2 class="image-viewer-title">Галерея изображений</h2>
            <button id="create-folder-btn" class="icon-btn" title="Создать папку">
              <i class="mdi mdi-folder-plus"></i>
            </button>
            <button id="gallery-upload-btn" class="icon-btn" title="Загрузить изображение">
              <i class="mdi mdi-image-plus"></i>
            </button>
          </div>
          <button class="close-btn">&times;</button>
        </div>
        <div class="current-folder">
          <div class="gallery-breadcrumbs"></div>
        </div>
        <div class="image-viewer-body">
          <div class="image-list-container" id="image-list-container">
            <div class="thumbnail-grid"></div>
          </div>
          <div class="image-details-panel">
            <div class="image-preview-container">
              <img id="image-preview" src="" alt="Preview">
            </div>
            <div class="image-info">
              <h3>Информация о файле</h3>
              <div class="info-row"><strong>Имя:</strong> <span id="info-name">-</span></div>
              <div class="info-row"><strong>Размер:</strong> <span id="info-size">-</span></div>
              <div class="info-row"><strong>Разрешение:</strong> <span id="info-dimensions">-</span></div>
              <div class="info-row"><strong>Дата загрузки:</strong> <span id="info-date">-</span></div>
              <div class="info-row"><strong>Путь:</strong> <span id="info-path">-</span></div>
            </div>
          </div>
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

    // Обработчик для загрузки изображений
    document.getElementById('gallery-upload-btn').addEventListener('click', () => {
      this.uploadImageToGallery();
    });

    resolve();
  });
}

async navigateToFolder(folderPath) {
  try {
    // Если кликнули на "images" - сбрасываем путь
    if (folderPath === '') {
      this.currentPath = '';
    } 
    // Если кликнули на промежуточную папку - устанавливаем соответствующий путь
    else {
      this.currentPath = folderPath;
    }
    
    await this.loadImageList();
    this.updateBreadcrumbs(this.currentPath);
  } catch (error) {
    console.error('Error navigating to folder:', error);
    showNotification('Не удалось загрузить содержимое папки', 'error');
  }
}

async uploadImageToGallery() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const loading = showNotification('Загрузка изображения...', 'info', 0);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Явно добавляем folder, даже если он пустой
      formData.append('folder', this.currentPath || '');
      
      const response = await fetch('/editor/api/upload-to-gallery', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const result = await response.json();
      
      // Обновляем галерею
      this.currentPage = 1;
      this.loadedPages.clear();
      await this.loadImageList();
      
      showNotification('Изображение успешно загружено', 'success');
      
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(`Ошибка загрузки: ${error.message}`, 'error');
    } finally {
      if (loading && loading.remove) {
        loading.remove();
      }
    }
  };
  
  input.click();
}

updateImageInfo(image) {
  if (!image) {
    // Скрываем или очищаем панель информации, если изображение не выбрано
    const detailsPanel = document.querySelector('.image-details-panel');
    if (detailsPanel) {
      detailsPanel.innerHTML = '<p>Выберите изображение для просмотра информации</p>';
    }
    return;
  }

  // Обновляем информацию на панели
  document.getElementById('info-name').textContent = image.originalName || '-';
  document.getElementById('info-size').textContent = image.size ? `${(image.size / 1024).toFixed(2)} KB` : '-';
  
  if (image.dimensions && image.dimensions.width && image.dimensions.height) {
    document.getElementById('info-dimensions').textContent = `${image.dimensions.width}×${image.dimensions.height}`;
  } else {
    document.getElementById('info-dimensions').textContent = '-';
  }
  
  document.getElementById('info-date').textContent = image.uploadDate ? 
    new Date(image.uploadDate).toLocaleString() : '-';
  document.getElementById('info-path').textContent = image.path || '-';
  
  // Обновляем превью
  const previewImg = document.getElementById('image-preview');
  if (image.path) {
    previewImg.src = `/${image.path}`;
  } else {
    previewImg.src = '';
  }
}

// Метод для обновления состояния кнопок
updateButtonsState() {
  const insertBtn = document.getElementById('insert-btn');
  const deleteBtn = document.getElementById('delete-btn');
  
  if (this.currentImage) {
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
  if (!this.currentImage) {
    showNotification('Сначала выберите изображение', 'error');
    return;
  }

  const image = this.currentImage;
  const confirmed = confirm(`Удалить изображение "${image.originalName}"?`);
  if (!confirmed) return;

  try {
    // Получаем путь к папке из image.path
    const folderPath = image.path.split('/').slice(1, -1).join('/');
    
    // Удаляем само изображение
    const deleteResponse = await fetch(`/editor/api/images?name=${encodeURIComponent(image.storedName)}&folder=${encodeURIComponent(folderPath)}`, {
      method: 'DELETE'
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Не удалось удалить изображение');
    }

    // Удаляем из локального списка
    this.images = this.images.filter(img => img.storedName !== image.storedName);
    this.currentImage = null;
    
    // Обновляем список
    await this.showImageList();
    showNotification('Изображение удалено', 'success');
  } catch (error) {
    console.error('Error deleting image:', error);
    showNotification(`Ошибка при удалении: ${error.message}`, 'error');
  }
}

async showImageList() {
  const container = document.getElementById('image-list-container');
  if (!container) {
    console.error('Container not found!');
    return;
  }

  // Очищаем контейнер
  container.innerHTML = '';

  // Создаем grid-контейнер
  const grid = document.createElement('div');
  grid.className = 'thumbnail-grid';
  
  // Добавляем папки
  if (this.folders.length > 0) {
    this.folders.forEach(folder => {
      const folderCard = document.createElement('div');
      folderCard.className = 'thumbnail-card folder-card';
      folderCard.innerHTML = `
        <div class="thumbnail-preview">
          <i class="mdi mdi-folder"></i>
        </div>
        <div class="thumbnail-name">${folder.name}</div>
      `;
      folderCard.addEventListener('click', () => this.navigateToFolder(folder.path));
      grid.appendChild(folderCard);
    });
  }

  // Добавляем изображения
  if (this.images.length > 0) {
    this.images.forEach(image => {
      const imgCard = document.createElement('div');
      imgCard.className = 'thumbnail-card';
      
      // Создаем элементы вручную вместо innerHTML
      const previewDiv = document.createElement('div');
      previewDiv.className = 'thumbnail-preview';
      
      const img = document.createElement('img');
      img.src = `/${image.path}`;
      img.alt = image.originalName;
      
      // Обработчик ошибки загрузки
      img.onerror = () => {
        previewDiv.innerHTML = '<i class="mdi mdi-image-broken" style="font-size:40px;color:#ccc;"></i>';
      };
      
      previewDiv.appendChild(img);
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'thumbnail-name';
      nameDiv.textContent = image.originalName;
      
      imgCard.appendChild(previewDiv);
      imgCard.appendChild(nameDiv);
      imgCard.addEventListener('click', () => this.selectImage(image));
      
      grid.appendChild(imgCard);
    });
  }

  // Если нет данных
  if (this.folders.length === 0 && this.images.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px;">Папка пуста</p>';
  }

  container.appendChild(grid);
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

async createImageCard(image, index) {
  const card = document.createElement('div');
  card.className = 'thumbnail-card image-card';
  card.dataset.index = index;
  card.style.border = '1px solid #ddd';
  card.style.borderRadius = '5px';
  card.style.padding = '8px';
  card.style.textAlign = 'center';
  card.style.cursor = 'pointer';
  card.style.transition = 'all 0.2s';
  card.style.position = 'relative'; // Для позиционирования tooltip
  
  // Добавляем tooltip с метаданными
  const tooltip = document.createElement('div');
  tooltip.className = 'image-tooltip';
  tooltip.style.display = 'none';
  tooltip.style.position = 'absolute';
  tooltip.style.bottom = '100%';
  tooltip.style.left = '50%';
  tooltip.style.transform = 'translateX(-50%)';
  tooltip.style.backgroundColor = 'white';
  tooltip.style.padding = '8px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  tooltip.style.zIndex = '100';
  tooltip.style.minWidth = '200px';
  tooltip.style.textAlign = 'left';
  tooltip.style.whiteSpace = 'nowrap';
  
  tooltip.innerHTML = `
    <div><strong>Имя:</strong> ${image.displayName || image.originalName || `Изображение ${index + 1}`}</div>
    <div><strong>Размер:</strong> ${image.size ? (image.size / 1024).toFixed(2) + ' KB' : 'неизвестно'}</div>
    ${image.dimensions ? `<div><strong>Разрешение:</strong> ${image.dimensions.width}x${image.dimensions.height}</div>` : ''}
    ${image.uploadDate ? `<div><strong>Загружено:</strong> ${new Date(image.uploadDate).toLocaleString()}</div>` : ''}
  `;
  
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
    const imgPath = image.path || `images/${image.storedName}`;
    const imgUrl = `${window.location.origin}/${imgPath}`;
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
  card.appendChild(tooltip);
  
  // Обработчики hover для tooltip и эффектов
  card.addEventListener('mouseenter', () => {
    tooltip.style.display = 'block';
    card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  });
  
  card.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
    card.style.boxShadow = 'none';
  });
  
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
  rootCrumb.dataset.path = '';
  rootCrumb.innerHTML = '<i class="mdi mdi-folder"></i> images';
  rootCrumb.addEventListener('click', () => {
    this.navigateToFolder('');
  });
  if (currentPath === '') {
    rootCrumb.classList.add('active');
  }
  breadcrumbsContainer.appendChild(rootCrumb);

  // Остальные части пути
  parts.forEach((part, index) => {
    pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;

    const separator = document.createElement('span');
    separator.className = 'gallery-separator';
    separator.textContent = '/';
    breadcrumbsContainer.appendChild(separator);

    const crumb = document.createElement('span');
    crumb.className = 'gallery-crumb';
    crumb.dataset.path = pathSoFar;
    crumb.innerHTML = `<i class="mdi mdi-folder"></i> ${part}`;
    crumb.addEventListener('click', () => {
      this.navigateToFolder(pathSoFar);
    });
    
    // Подсвечиваем только последнюю крошку (текущую папку)
    if (index === parts.length - 1) {
      crumb.classList.add('active');
    }
    
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
    if (!this.currentImage) {
      showNotification('Сначала выберите изображение', 'error');
      return;
    }

    const image = this.currentImage;
    const markdown = `![${image.originalName || image.displayName}](${image.path})`;
    
    if (typeof Editor !== 'undefined' && Editor.insertAtCursor) {
      Editor.insertAtCursor(markdown);
      this.hide();
    } else {
      // Fallback для случаев, когда Editor не доступен
      const textarea = document.querySelector('textarea, [contenteditable]');
      if (textarea) {
        const selectionStart = textarea.selectionStart;
        const value = textarea.value || textarea.innerText;
        textarea.value = value.slice(0, selectionStart) + markdown + value.slice(selectionStart);
        textarea.dispatchEvent(new Event('input'));
      } else {
        showNotification('Редактор не доступен', 'error');
      }
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

  selectImage(image) {
    // Снимаем выделение со всех карточек
    document.querySelectorAll('.thumbnail-card').forEach(card => {
      card.classList.remove('selected');
    });

    // Находим карточку с этим изображением
    const cards = document.querySelectorAll('.thumbnail-card');
    for (const card of cards) {
      const img = card.querySelector('img');
      if (img && img.src.includes(image.storedName || encodeURIComponent(image.originalName))) {
        // Добавляем класс selected
        card.classList.add('selected');
        
        // Сохраняем выбранное изображение
        this.currentImage = image;
        
        // Обновляем состояние кнопок
        this.updateButtonsState();
        
        // Обновляем информацию о файле
        this.updateImageInfo(image);
        break;
      }
    }
  }

}

// Web Worker для обработки метаданных
const setupMetaWorker = () => {
  if (window.Worker) {
    const metaWorker = new Worker('js/meta-worker.js');
    
    metaWorker.onmessage = (e) => {
      if (e.data.error) {
        console.error('Worker error:', e.data.error);
      } else {
        // Обработка данных от воркера
        window.imageViewer?.processMetaData?.(e.data);
      }
    };
    
    return metaWorker;
  }
  return null;
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  window.imageViewer = new ImageViewer();
  window.imageViewer.metaWorker = setupMetaWorker(); // Сохраняем ссылку на воркер
  window.imageViewer.init();
});

