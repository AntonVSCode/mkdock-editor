function SettingsEditor() {
  this.modalId = 'settings-modal';
  this.editor = null;
  this.defaultConfigPath = '/editor/api/mkdocs-default-config';
  this.configPath = '/editor/api/mkdocs-config';
  // Добавляем пути для загрузки изображений
  this.faviconPath = '/editor/api/upload-favicon';
  this.logoPath = '/editor/api/upload-logo';
 this.imagesBasePath = '/assets/';
  
  // Цветовые схемы для Material темы
  this.colorSchemes = {
    primary: ['red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green', 'light-green', 'lime', 'yellow', 'amber', 'orange', 'deep-orange', 'brown', 'grey', 'blue-grey'],
    accent: ['red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green', 'light-green', 'lime', 'yellow', 'amber', 'orange', 'deep-orange', 'brown', 'grey', 'blue-grey']
  };

    // Добавляем список иконок для переключения темы
  this.toggleIcons = [
    { light: 'material/brightness-7', dark: 'material/brightness-4' },
    { light: 'material/toggle-switch', dark: 'material/toggle-switch-off-outline' },
    { light: 'material/weather-sunny', dark: 'material/weather-night' },
    { light: 'material/eye', dark: 'material/eye-outline' },
    { light: 'material/lightbulb', dark: 'material/lightbulb-outline' }
  ];

  // В конструктор SettingsEditor добавляем список фич
  this.featuresList = [
    // Навигационные фичи
    { name: 'navigation.tabs', label: 'Вкладки в верхней навигации' },
    { name: 'navigation.top', label: 'Кнопка "Наверх"' },
    { name: 'navigation.indexes', label: 'Индексы для навигации' },
    { name: 'navigation.sections', label: 'Секционная навигация' },
    { name: 'navigation.expand', label: 'Разворачивать разделы' },
    { name: 'navigation.instant', label: 'Мгновенная навигация' },
    { name: 'navigation.tracking', label: 'Отслеживание активного раздела' },
    
    // Поиск
    { name: 'search.highlight', label: 'Подсветка результатов поиска' },
    { name: 'search.suggest', label: 'Подсказки при поиске' },
    { name: 'search.share', label: 'Поделиться поиском' },
    
    // Работа с контентом
    { name: 'toc.integrate', label: 'Интегрированное оглавление' },
    { name: 'content.tabs', label: 'Вкладки в контенте' },
    { name: 'content.code.annotate', label: 'Аннотации к коду' },
    { name: 'content.code.copy', label: 'Копирование кода' },
    { name: 'content.code.select', label: 'Выделение кода' },
    { name: 'content.action.edit', label: 'Редактирование страницы' },
    
    // Дополнительные фичи
    { name: 'header.autohide', label: 'Автоскрытие заголовка' },
    { name: 'navigation.path', label: 'Хлебные крошки' },
    { name: 'navigation.footer', label: 'Нижняя навигация' },
    { name: 'navigation.instant.progress', label: 'Прогресс-бар навигации' }
  ];

  this.init = function() {
    this.createModal();
    this.bindEvents();
    this.checkExistingImages(); // Проверяем существующие изображения при инициализации
  };

  this.createModal = function() {
    const modalHTML = `
      <div class="settings-modal" id="${this.modalId}">
        <div class="settings-modal-overlay"></div>
        <div class="settings-modal-content">
          <div class="settings-modal-header">
            <h3>Редактирование mkdocs.yml</h3>
            <div class="settings-header-fields">
              <div class="settings-field">
                <label>Название сайта:</label>
                <input type="text" id="site-name-input" class="settings-input">
              </div>
              <div class="settings-field">
                <label>Папка документации:</label>
                <input type="text" id="docs-dir-input" class="settings-input" value="docs">
              </div>
              <div class="settings-field">
                <label>Папка сборки:</label>
                <input type="text" id="site-dir-input" class="settings-input" value="site">
              </div>
            </div>
            <button class="settings-close-modal">&times;</button>
          </div>
          
          <div class="settings-modal-body">
            <!-- Левая колонка - настройки -->
            <div class="settings-options-column">
              <!-- Добавляем секцию для favicon и лого -->
              <div class="settings-images-section">
                <h4>Изображения сайта</h4>
                
                <div class="image-upload-group">
                  <label>Favicon (favicon.ico):</label>
                  <div class="image-upload-container">
                    <input type="file" id="favicon-upload" accept=".ico,image/x-icon" style="display: none;">
                    <button id="upload-favicon-btn" class="btn btn-secondary">
                      <i class="mdi mdi-file-image"></i> Загрузить favicon
                    </button>
                    <div id="favicon-preview" class="image-preview"></div>
                  </div>
                </div>
                
                <div class="image-upload-group">
                  <label>Логотип:</label>
                  <div class="image-upload-container">
                    <input type="file" id="logo-upload" accept="image/*" style="display: none;">
                    <button id="upload-logo-btn" class="btn btn-secondary">
                      <i class="mdi mdi-file-image"></i> Загрузить логотип
                    </button>
                    <div id="logo-preview" class="image-preview"></div>
                  </div>
                  <div class="settings-field">
                    <label>Название логотипа (alt текст):</label>
                    <input type="text" id="logo-alt-input" class="settings-input" placeholder="Логотип сайта">
                  </div>
                </div>
              </div>
              <div class="settings-theme-selector">
                <div class="theme-option">
                  <label>Иконка переключения темы:</label>
                  <select id="theme-toggle-icon" class="color-select">
                    ${this.toggleIcons.map((icon, index) => 
                      `<option value="${index}">${icon.light} / ${icon.dark}</option>`
                    ).join('')}
                  </select>
                  <div class="icon-preview">
                    <i class="mdi" id="light-icon-preview"></i>
                    <span>Светлая</span>
                    <i class="mdi" id="dark-icon-preview"></i>
                    <span>Тёмная</span>
                  </div>
                  <label>
                    <input type="checkbox" id="use-dark-theme" class="theme-toggle">
                    Использовать темную тему
                  </label>
                  <div class="theme-selection dark-theme-selection" style="display: none;">
                    <div class="color-picker">
                      <label>Primary цвет:</label>
                      <select id="dark-primary-color" class="color-select">
                        ${this.colorSchemes.primary.map(color => `<option value="${color}">${color}</option>`).join('')}
                      </select>
                      <div id="dark-primary-preview" class="color-preview"></div>
                    </div>
                    <div class="color-picker">
                      <label>Accent цвет:</label>
                      <select id="dark-accent-color" class="color-select">
                        ${this.colorSchemes.accent.map(color => `<option value="${color}">${color}</option>`).join('')}
                      </select>
                      <div id="dark-accent-preview" class="color-preview"></div>
                    </div>
                  </div>
                </div>
                <div class="theme-option">
                  <label>
                    <input type="checkbox" id="use-light-theme" class="theme-toggle" checked>
                    Использовать светлую тему
                  </label>
                  <div class="theme-selection light-theme-selection">
                    <div class="color-picker">
                      <label>Primary цвет:</label>
                      <select id="light-primary-color" class="color-select">
                        ${this.colorSchemes.primary.map(color => `<option value="${color}">${color}</option>`).join('')}
                      </select>
                      <div id="light-primary-preview" class="color-preview"></div>
                    </div>
                    <div class="color-picker">
                      <label>Accent цвет:</label>
                      <select id="light-accent-color" class="color-select">
                        ${this.colorSchemes.accent.map(color => `<option value="${color}">${color}</option>`).join('')}
                      </select>
                      <div id="light-accent-preview" class="color-preview"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="settings-features-section">
                <div class="features-option">
                  <label>
                    <input type="checkbox" id="use-features" class="features-toggle">
                    Настройка features
                  </label>
                  <div class="features-selection" style="display: none;">
                    <div class="features-grid">
                      <!-- Блок навигационных фич -->
                      <div class="feature-block">
                        <h4>Навигационные фичи</h4>
                        <div class="features-group">
                          ${this.featuresList.slice(0, 7).map(feature => `
                            <div class="feature-checkbox">
                              <label>
                                <input type="checkbox" class="feature-toggle" data-feature="${feature.name}">
                                ${feature.label} <small>(${feature.name})</small>
                              </label>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                      
                      <!-- Блок поиска -->
                      <div class="feature-block">
                        <h4>Поиск</h4>
                        <div class="features-group">
                          ${this.featuresList.slice(7, 10).map(feature => `
                            <div class="feature-checkbox">
                              <label>
                                <input type="checkbox" class="feature-toggle" data-feature="${feature.name}">
                                ${feature.label} <small>(${feature.name})</small>
                              </label>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                      
                      <!-- Блок работы с контентом -->
                      <div class="feature-block">
                        <h4>Работа с контентом</h4>
                        <div class="features-group">
                          ${this.featuresList.slice(10, 16).map(feature => `
                            <div class="feature-checkbox">
                              <label>
                                <input type="checkbox" class="feature-toggle" data-feature="${feature.name}">
                                ${feature.label} <small>(${feature.name})</small>
                              </label>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                      
                      <!-- Блок дополнительных фич -->
                      <div class="feature-block">
                        <h4>Дополнительные фичи</h4>
                        <div class="features-group">
                          ${this.featuresList.slice(16).map(feature => `
                            <div class="feature-checkbox">
                              <label>
                                <input type="checkbox" class="feature-toggle" data-feature="${feature.name}">
                                ${feature.label} <small>(${feature.name})</small>
                              </label>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Правая колонка - редактор -->
            <div class="settings-editor-column">
              <div class="settings-editor-container">
                <textarea id="settings-editor"></textarea>
              </div>
            </div>
          </div>
          
          <div class="settings-modal-footer">
            <button id="save-settings" class="btn btn-primary">
              <i class="mdi mdi-content-save"></i> Сохранить
            </button>
            <button id="reset-settings" class="btn btn-secondary">
              <i class="mdi mdi-backup-restore"></i> Восстановить по умолчанию
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  };

  this.bindEvents = function() {
    var self = this;
    
    const settingsLink = document.querySelector('.explorer-footer a');
    const modalClose = document.querySelector('#' + this.modalId + ' .settings-close-modal');
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');

    if (settingsLink) {
      settingsLink.addEventListener('click', function(e) {
        e.preventDefault();
        self.openEditor();
      });
    }

    if (modalClose) {
      modalClose.addEventListener('click', function() {
        self.closeEditor(); // Добавлены скобки для вызова функции
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        self.saveSettings();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        self.resetSettings();
      });
    }

    // Обработчики для выбора темы
    document.getElementById('use-dark-theme').addEventListener('change', function() {
      document.querySelector('.dark-theme-selection').style.display = 
        this.checked ? 'block' : 'none';
      self.updateThemePreview();
    });

    document.getElementById('use-light-theme').addEventListener('change', function() {
      document.querySelector('.light-theme-selection').style.display = 
        this.checked ? 'block' : 'none';
      self.updateThemePreview();
    });

    document.getElementById('theme-toggle-icon').addEventListener('change', function() {
      const iconIndex = parseInt(this.value);
      const selectedIcon = self.toggleIcons[iconIndex];
      self.updateIconPreview(selectedIcon);
    });

    // Обработчики для features
    document.getElementById('use-features').addEventListener('change', function() {
      const isChecked = this.checked;
      const featuresSection = document.querySelector('.features-selection');
      featuresSection.style.display = isChecked ? 'block' : 'none';
      
      document.querySelectorAll('.feature-toggle').forEach(checkbox => {
        checkbox.disabled = !isChecked;
        if (!isChecked) {
          checkbox.checked = false;
        }
      });
    });

    // Обработчики для загрузки изображений
    document.getElementById('upload-favicon-btn').addEventListener('click', function() {
      document.getElementById('favicon-upload').click();
    });

    document.getElementById('upload-logo-btn').addEventListener('click', function() {
      document.getElementById('logo-upload').click();
    });

    document.getElementById('favicon-upload').addEventListener('change', function(e) {
      self.uploadImage(e.target.files[0], self.faviconPath, 'favicon-preview', 'favicon.ico');
    });

    document.getElementById('logo-upload').addEventListener('change', function(e) {
      self.uploadImage(e.target.files[0], self.logoPath, 'logo-preview');
    });

    // Обработчики для выбора цвета
    document.getElementById('dark-primary-color').addEventListener('change', self.updateThemePreview.bind(self));
    document.getElementById('dark-accent-color').addEventListener('change', self.updateThemePreview.bind(self));
    document.getElementById('light-primary-color').addEventListener('change', self.updateThemePreview.bind(self));
    document.getElementById('light-accent-color').addEventListener('change', self.updateThemePreview.bind(self));
  };

  // Проверяем существующие изображения
  this.checkExistingImages = function() {
    this.checkImageExists('favicon.ico', 'favicon-preview');
    this.checkImageExists('logo.png', 'logo-preview');
  };

  this.checkImageExists = function(filename, previewId) {
    const imgPath = this.imagesBasePath + filename;
    fetch(imgPath)
      .then(response => {
        if (response.ok) {
          this.showImagePreview(filename, previewId);
        }
      })
      .catch(() => { /* Изображение не существует */ });
  };

  this.showImagePreview = function(filename, previewId) {
    const previewDiv = document.getElementById(previewId);
    const imgPath = this.imagesBasePath + filename + '?' + Date.now(); // Добавляем timestamp для избежания кеширования
    
    if (filename.endsWith('.ico')) {
      // Для favicon.ico используем объект для отображения
      previewDiv.innerHTML = `
        <div class="image-preview-content">
          <object data="${imgPath}" type="image/x-icon" width="32" height="32">
            <img src="${imgPath}" alt="Favicon" width="32" height="32">
          </object>
          <span>${filename}</span>
        </div>
      `;
    } else {
      // Для обычных изображений
      previewDiv.innerHTML = `
        <div class="image-preview-content">
          <img src="${imgPath}" alt="Логотип" style="max-height: 50px; max-width: 100%;">
          <span>${filename}</span>
        </div>
      `;
    }
  };

  this.uploadImage = function(file, endpoint, previewId, forcedName = null) {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    if (forcedName) {
      formData.append('forcedName', forcedName);
    }

    fetch(endpoint, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        this.showImagePreview(forcedName || file.name, previewId);
        if (window.showNotification) {
          showNotification('Изображение успешно загружено', 'success');
        }
      } else {
        throw new Error(data.error || 'Ошибка загрузки');
      }
    })
    .catch(error => {
      console.error('Ошибка загрузки изображения:', error);
      if (window.showNotification) {
        showNotification('Ошибка загрузки изображения: ' + error.message, 'error');
      }
    });
  };

  this.closeEditor = function() {
    document.getElementById(this.modalId).style.display = 'none';
  };

  this.updateThemePreview = function() {
    // Обновляем превью цветов для темной темы
    const darkPrimary = document.getElementById('dark-primary-color').value;
    const darkAccent = document.getElementById('dark-accent-color').value;
    document.getElementById('dark-primary-preview').style.backgroundColor = this.getMaterialColor(darkPrimary, 500);
    document.getElementById('dark-accent-preview').style.backgroundColor = this.getMaterialColor(darkAccent, 200);

    // Обновляем превью цветов для светлой темы
    const lightPrimary = document.getElementById('light-primary-color').value;
    const lightAccent = document.getElementById('light-accent-color').value;
    document.getElementById('light-primary-preview').style.backgroundColor = this.getMaterialColor(lightPrimary, 500);
    document.getElementById('light-accent-preview').style.backgroundColor = this.getMaterialColor(lightAccent, 200);
  };

  this.getMaterialColor = function(color, shade) {
    const colors = {
      'red': { 
        50: '#ffebee', 100: '#ffcdd2', 200: '#ef9a9a', 300: '#e57373', 
        400: '#ef5350', 500: '#f44336', 600: '#e53935', 700: '#d32f2f', 
        800: '#c62828', 900: '#b71c1c', A100: '#ff8a80', A200: '#ff5252', 
        A400: '#ff1744', A700: '#d50000'
      },
      'pink': { 
        50: '#fce4ec', 100: '#f8bbd0', 200: '#f48fb1', 300: '#f06292', 
        400: '#ec407a', 500: '#e91e63', 600: '#d81b60', 700: '#c2185b', 
        800: '#ad1457', 900: '#880e4f', A100: '#ff80ab', A200: '#ff4081', 
        A400: '#f50057', A700: '#c51162'
      },
      'purple': { 
        50: '#f3e5f5', 100: '#e1bee7', 200: '#ce93d8', 300: '#ba68c8', 
        400: '#ab47bc', 500: '#9c27b0', 600: '#8e24aa', 700: '#7b1fa2', 
        800: '#6a1b9a', 900: '#4a148c', A100: '#ea80fc', A200: '#e040fb', 
        A400: '#d500f9', A700: '#aa00ff'
      },
      'deep-purple': { 
        50: '#ede7f6', 100: '#d1c4e9', 200: '#b39ddb', 300: '#9575cd', 
        400: '#7e57c2', 500: '#673ab7', 600: '#5e35b1', 700: '#512da8', 
        800: '#4527a0', 900: '#311b92', A100: '#b388ff', A200: '#7c4dff', 
        A400: '#651fff', A700: '#6200ea'
      },
      'indigo': { 
        50: '#e8eaf6', 100: '#c5cae9', 200: '#9fa8da', 300: '#7986cb', 
        400: '#5c6bc0', 500: '#3f51b5', 600: '#3949ab', 700: '#303f9f', 
        800: '#283593', 900: '#1a237e', A100: '#8c9eff', A200: '#536dfe', 
        A400: '#3d5afe', A700: '#304ffe'
      },
      'blue': { 
        50: '#e3f2fd', 100: '#bbdefb', 200: '#90caf9', 300: '#64b5f6', 
        400: '#42a5f5', 500: '#2196f3', 600: '#1e88e5', 700: '#1976d2', 
        800: '#1565c0', 900: '#0d47a1', A100: '#82b1ff', A200: '#448aff', 
        A400: '#2979ff', A700: '#2962ff'
      },
      'light-blue': { 
        50: '#e1f5fe', 100: '#b3e5fc', 200: '#81d4fa', 300: '#4fc3f7', 
        400: '#29b6f6', 500: '#03a9f4', 600: '#039be5', 700: '#0288d1', 
        800: '#0277bd', 900: '#01579b', A100: '#80d8ff', A200: '#40c4ff', 
        A400: '#00b0ff', A700: '#0091ea'
      },
      'cyan': { 
        50: '#e0f7fa', 100: '#b2ebf2', 200: '#80deea', 300: '#4dd0e1', 
        400: '#26c6da', 500: '#00bcd4', 600: '#00acc1', 700: '#0097a7', 
        800: '#00838f', 900: '#006064', A100: '#84ffff', A200: '#18ffff', 
        A400: '#00e5ff', A700: '#00b8d4'
      },
      'teal': { 
        50: '#e0f2f1', 100: '#b2dfdb', 200: '#80cbc4', 300: '#4db6ac', 
        400: '#26a69a', 500: '#009688', 600: '#00897b', 700: '#00796b', 
        800: '#00695c', 900: '#004d40', A100: '#a7ffeb', A200: '#64ffda', 
        A400: '#1de9b6', A700: '#00bfa5'
      },
      'green': { 
        50: '#e8f5e9', 100: '#c8e6c9', 200: '#a5d6a7', 300: '#81c784', 
        400: '#66bb6a', 500: '#4caf50', 600: '#43a047', 700: '#388e3c', 
        800: '#2e7d32', 900: '#1b5e20', A100: '#b9f6ca', A200: '#69f0ae', 
        A400: '#00e676', A700: '#00c853'
      },
      'light-green': { 
        50: '#f1f8e9', 100: '#dcedc8', 200: '#c5e1a5', 300: '#aed581', 
        400: '#9ccc65', 500: '#8bc34a', 600: '#7cb342', 700: '#689f38', 
        800: '#558b2f', 900: '#33691e', A100: '#ccff90', A200: '#b2ff59', 
        A400: '#76ff03', A700: '#64dd17'
      },
      'lime': { 
        50: '#f9fbe7', 100: '#f0f4c3', 200: '#e6ee9c', 300: '#dce775', 
        400: '#d4e157', 500: '#cddc39', 600: '#c0ca33', 700: '#afb42b', 
        800: '#9e9d24', 900: '#827717', A100: '#f4ff81', A200: '#eeff41', 
        A400: '#c6ff00', A700: '#aeea00'
      },
      'yellow': { 
        50: '#fffde7', 100: '#fff9c4', 200: '#fff59d', 300: '#fff176', 
        400: '#ffee58', 500: '#ffeb3b', 600: '#fdd835', 700: '#fbc02d', 
        800: '#f9a825', 900: '#f57f17', A100: '#ffff8d', A200: '#ffff00', 
        A400: '#ffea00', A700: '#ffd600'
      },
      'amber': { 
        50: '#fff8e1', 100: '#ffecb3', 200: '#ffe082', 300: '#ffd54f', 
        400: '#ffca28', 500: '#ffc107', 600: '#ffb300', 700: '#ffa000', 
        800: '#ff8f00', 900: '#ff6f00', A100: '#ffe57f', A200: '#ffd740', 
        A400: '#ffc400', A700: '#ffab00'
      },
      'orange': { 
        50: '#fff3e0', 100: '#ffe0b2', 200: '#ffcc80', 300: '#ffb74d', 
        400: '#ffa726', 500: '#ff9800', 600: '#fb8c00', 700: '#f57c00', 
        800: '#ef6c00', 900: '#e65100', A100: '#ffd180', A200: '#ffab40', 
        A400: '#ff9100', A700: '#ff6d00'
      },
      'deep-orange': { 
        50: '#fbe9e7', 100: '#ffccbc', 200: '#ffab91', 300: '#ff8a65', 
        400: '#ff7043', 500: '#ff5722', 600: '#f4511e', 700: '#e64a19', 
        800: '#d84315', 900: '#bf360c', A100: '#ff9e80', A200: '#ff6e40', 
        A400: '#ff3d00', A700: '#dd2c00'
      },
      'brown': { 
        50: '#efebe9', 100: '#d7ccc8', 200: '#bcaaa4', 300: '#a1887f', 
        400: '#8d6e63', 500: '#795548', 600: '#6d4c41', 700: '#5d4037', 
        800: '#4e342e', 900: '#3e2723'
      },
      'grey': { 
        50: '#fafafa', 100: '#f5f5f5', 200: '#eeeeee', 300: '#e0e0e0', 
        400: '#bdbdbd', 500: '#9e9e9e', 600: '#757575', 700: '#616161', 
        800: '#424242', 900: '#212121'
      },
      'blue-grey': { 
        50: '#eceff1', 100: '#cfd8dc', 200: '#b0bec5', 300: '#90a4ae', 
        400: '#78909c', 500: '#607d8b', 600: '#546e7a', 700: '#455a64', 
        800: '#37474f', 900: '#263238'
      }
    };
    
    return colors[color]?.[shade] || '#ffffff';
  };

  this.openEditor = function() {
    var self = this;
    fetch(this.configPath)
      .then(function(response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
      })
      .then(function(content) {
        // Парсим основные параметры
        const siteNameMatch = content.match(/site_name:\s*(.*)/);
        const docsDirMatch = content.match(/docs_dir:\s*(.*)/);
        const siteDirMatch = content.match(/site_dir:\s*(.*)/);
        // Парсим настройки логотипа
        const config = jsyaml.load(content) || {};
        if (config.theme && config.theme.logo) {
          document.getElementById('logo-alt-input').value = config.theme.logo;
        }

        // Проверяем существующие изображения
        self.checkExistingImages();
        
        if (siteNameMatch) {
          document.getElementById('site-name-input').value = siteNameMatch[1].trim();
        }
        if (docsDirMatch) {
          document.getElementById('docs-dir-input').value = docsDirMatch[1].trim();
        }
        if (siteDirMatch) {
          document.getElementById('site-dir-input').value = siteDirMatch[1].trim();
        }

        // Парсим настройки темы
        const themeConfig = self.parseThemeConfig(content);
        self.updateThemeControls(themeConfig);
        
        // Инициализируем CodeMirror
        const textarea = document.getElementById('settings-editor');
        self.editor = CodeMirror.fromTextArea(textarea, {
          mode: 'yaml',
          lineNumbers: true,
          theme: 'material',
          indentUnit: 2,
          tabSize: 2,
          lineWrapping: true,
          gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
          foldGutter: true,
          autoRefresh: true,
          viewportMargin: Infinity // Для лучшей прокрутки
        });
        
        self.editor.setValue(content);
        setTimeout(() => {
          self.editor.refresh();
          // Прокручиваем до конца
          self.editor.execCommand('goDocEnd');
        }, 100);
        
        document.getElementById(self.modalId).style.display = 'block';
        self.updateThemePreview();
      })
      .catch(function(error) {
        console.error('Ошибка загрузки конфига:', error);
        if (window.showNotification) {
          showNotification('Ошибка загрузки конфигурации', 'error');
        }
      });
  };

  this.parseThemeConfig = function(content) {
    try {
      const config = jsyaml.load(content) || {};
      const theme = config.theme || {};
      const palette = theme.palette || [];
      const toggleIcon = this.findToggleIcon(theme);
      
      const darkTheme = palette.find(p => p.scheme === 'slate');
      const lightTheme = palette.find(p => p.scheme === 'default');

      // Получаем features ТОЛЬКО из theme.features
      const activeFeatures = Array.isArray(theme.features) ? theme.features : [];
      
      // Строгая проверка содержимого features
      const validFeatures = activeFeatures.filter(f => 
        this.featuresList.some(fl => fl.name === f)
      );
      
      return {
        useDark: !!darkTheme,
        useLight: !lightTheme ? true : !!lightTheme,
        darkPrimary: darkTheme?.primary || 'indigo',
        darkAccent: darkTheme?.accent || 'blue',
        lightPrimary: lightTheme?.primary || 'indigo',
        lightAccent: lightTheme?.accent || 'blue',
        toggleIconIndex: toggleIcon.index || 0,
        toggleIcon: toggleIcon.value || this.toggleIcons[0],
        useFeatures: activeFeatures.length > 0,
        // Устанавливаем только те фичи, которые есть в списке
        activeFeatures: activeFeatures.length > 0 ? validFeatures : []
      };
    } catch (e) {
      console.error('Ошибка парсинга конфига:', e);
      return {
        useDark: false,
        useLight: true,
        darkPrimary: 'indigo',
        darkAccent: 'blue',
        lightPrimary: 'indigo',
        lightAccent: 'blue',
        toggleIconIndex: 0,
        toggleIcon: this.toggleIcons[0],
        useFeatures: false,
        activeFeatures: []
      };
    }
  };

    this.findToggleIcon = function(theme) {
    if (!theme.palette) return { index: 0, value: this.toggleIcons[0] };
    
    for (let i = 0; i < theme.palette.length; i++) {
      const palette = theme.palette[i];
      if (palette.toggle && palette.toggle.icon) {
        const iconName = palette.toggle.icon;
        const foundIndex = this.toggleIcons.findIndex(icon => 
          icon.light === iconName || icon.dark === iconName
        );
        
        if (foundIndex >= 0) {
          return { index: foundIndex, value: this.toggleIcons[foundIndex] };
        }
      }
    }
    return { index: 0, value: this.toggleIcons[0] };
  };

  this.updateThemeControls = function(themeConfig) {
    document.getElementById('use-dark-theme').checked = themeConfig.useDark;
    document.getElementById('use-light-theme').checked = themeConfig.useLight;
    document.querySelector('.dark-theme-selection').style.display = 
      themeConfig.useDark ? 'block' : 'none';
    document.querySelector('.light-theme-selection').style.display = 
      themeConfig.useLight ? 'block' : 'none';
    
    document.getElementById('dark-primary-color').value = themeConfig.darkPrimary;
    document.getElementById('dark-accent-color').value = themeConfig.darkAccent;
    document.getElementById('light-primary-color').value = themeConfig.lightPrimary;
    document.getElementById('light-accent-color').value = themeConfig.lightAccent;
    
    // Обновляем выбор иконки
    document.getElementById('theme-toggle-icon').value = themeConfig.toggleIconIndex;
    this.updateIconPreview(themeConfig.toggleIcon);

    // Жесткий сброс всех чекбоксов перед обновлением
    document.querySelectorAll('.feature-toggle').forEach(checkbox => {
      checkbox.checked = false;
    });

    // Устанавливаем только те чекбоксы, которые есть в theme.features
    this.featuresList.forEach(feature => {
      const checkbox = document.querySelector(`.feature-toggle[data-feature="${feature.name}"]`);
      if (checkbox) {
        checkbox.checked = themeConfig.activeFeatures.includes(feature.name);
      }
    });

    // Управление основным чекбоксом
    const hasFeatures = themeConfig.activeFeatures.length > 0;
    document.getElementById('use-features').checked = hasFeatures;
    document.querySelector('.features-selection').style.display = hasFeatures ? 'block' : 'none';
  };

  this.updateIconPreview = function(icon) {
    const lightPreview = document.getElementById('light-icon-preview');
    const darkPreview = document.getElementById('dark-icon-preview');
    
    lightPreview.className = 'mdi ' + icon.light;
    darkPreview.className = 'mdi ' + icon.dark;
  };

  
  this.saveSettings = function() {
  var self = this;
  
  try {
    // Получаем текущий контент редактора
    const originalContent = this.editor.getValue();
    let config = jsyaml.load(originalContent) || {};
    
    // Обновляем только базовые параметры
    config.site_name = document.getElementById('site-name-input').value;
    config.docs_dir = document.getElementById('docs-dir-input').value;
    config.site_dir = document.getElementById('site-dir-input').value;

    // Обновляем настройки темы
    if (!config.theme) config.theme = {};
    config.theme.name = 'material';

    // Убедимся, что есть раздел theme
    if (!config.theme) {
      config.theme = {};
    }

    // Сохраняем alt текст логотипа
    const logoAlt = document.getElementById('logo-alt-input').value.trim();
      if (logoAlt) {
        if (!config.theme) config.theme = {};
        config.theme.logo = logoAlt;
      } else if (config.theme && config.theme.logo) {
        delete config.theme.logo;
      }
    
    // Обновляем ТОЛЬКО theme.features
    const useFeatures = document.getElementById('use-features').checked;
    if (useFeatures) {
      config.theme.features = [];
      this.featuresList.forEach(feature => {
        const checkbox = document.querySelector(`.feature-toggle[data-feature="${feature.name}"]`);
        if (checkbox && checkbox.checked) {
          config.theme.features.push(feature.name);
        }
      });
      
      // Удаляем пустой массив
      if (config.theme.features.length === 0) {
        delete config.theme.features;
      }
    } else {
      delete config.theme.features;
    }
    
    // Получаем настройки из UI
    const useDark = document.getElementById('use-dark-theme').checked;
    const useLight = document.getElementById('use-light-theme').checked;
    const darkPrimary = document.getElementById('dark-primary-color').value;
    const darkAccent = document.getElementById('dark-accent-color').value;
    const lightPrimary = document.getElementById('light-primary-color').value;
    const lightAccent = document.getElementById('light-accent-color').value;
    const iconIndex = parseInt(document.getElementById('theme-toggle-icon').value);
    const selectedIcon = this.toggleIcons[iconIndex];

    // Обновляем palette
    config.theme.palette = [];
    
    if (useLight) {
      config.theme.palette.push({
        scheme: 'default',
        primary: lightPrimary,
        accent: lightAccent,
        toggle: {
          icon: selectedIcon.light,
          name: 'Switch to dark mode'
        }
      });
    }
    
    if (useDark) {
      config.theme.palette.push({
        scheme: 'slate',
        primary: darkPrimary,
        accent: darkAccent,
        toggle: {
          icon: selectedIcon.dark,
          name: 'Switch to light mode'
        }
      });
    }

    // Сохраняем оригинальные секции без изменений
    const originalConfig = jsyaml.load(originalContent);
    const preservedSections = [
      'markdown_extensions',
      'plugins',
      'extra',
      'nav'
    ];
    
    preservedSections.forEach(section => {
      if (originalConfig[section] !== undefined) {
        config[section] = originalConfig[section];
      }
    });

    // Генерируем новый YAML
    const updatedContent = jsyaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    
    // Обновляем редактор
    this.editor.setValue(updatedContent);
    
    // Отправляем на сервер
    fetch(this.configPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: updatedContent })
    }).then(function(response) {
      if (!response.ok) throw new Error('Network response was not ok');
      if (window.showNotification) {
        showNotification('Настройки успешно сохранены', 'success');
      }
      self.closeEditor();
      setTimeout(() => location.reload(), 500);
    }).catch(function(error) {
      console.error('Ошибка сохранения:', error);
      if (window.showNotification) {
        showNotification('Ошибка сохранения настроек', 'error');
      }
    });
    
  } catch (e) {
    console.error('Ошибка парсинга YAML:', e);
    if (window.showNotification) {
      showNotification('Ошибка в формате конфигурации', 'error');
    }
  }
};

// this.generateYamlWithComments = function(originalContent, newConfig) {
//   // Разбиваем оригинальный контент на строки
//   const originalLines = originalContent.split('\n');
  
//   // Сначала генерируем новый YAML без комментариев
//   const newYaml = jsyaml.dump(newConfig, {
//     indent: 2,
//     lineWidth: -1,
//     noRefs: true,
//     sortKeys: false
//   });
//   const newLines = newYaml.split('\n');
  
//   // Секции, которые нужно сохранить в оригинальном виде
//   const preservedSections = [
//     'markdown_extensions',
//     'plugins',
//     'extra',
//     'features',
//     'nav'
//   ];
  
//   // Собираем позиции и содержимое секций из оригинального файла
//   const sectionRanges = {};
//   let currentSection = null;
//   let sectionStart = -1;
  
//   for (let i = 0; i < originalLines.length; i++) {
//     const line = originalLines[i];
//     const sectionMatch = line.match(/^([a-z_]+):/);
    
//     if (sectionMatch && preservedSections.includes(sectionMatch[1])) {
//       // Завершаем предыдущую секцию
//       if (currentSection && sectionStart !== -1) {
//         sectionRanges[currentSection] = {
//           start: sectionStart,
//           end: i - 1,
//           lines: originalLines.slice(sectionStart, i)
//         };
//       }
//       // Начинаем новую секцию
//       currentSection = sectionMatch[1];
//       sectionStart = i;
//     }
//   }
  
//   // Сохраняем последнюю секцию
//   if (currentSection && sectionStart !== -1) {
//     sectionRanges[currentSection] = {
//       start: sectionStart,
//       end: originalLines.length - 1,
//       lines: originalLines.slice(sectionStart)
//     };
//   }
  
//   // Строим итоговый контент
//   let finalLines = [];
//   let inPreservedSection = false;
  
//   for (let i = 0; i < newLines.length; i++) {
//     const line = newLines[i];
//     const sectionMatch = line.match(/^([a-z_]+):/);
    
//     if (sectionMatch && preservedSections.includes(sectionMatch[1])) {
//       // Нашли секцию, которую нужно сохранить из оригинала
//       const sectionName = sectionMatch[1];
//       if (sectionRanges[sectionName]) {
//         // Добавляем оригинальное содержимое секции
//         finalLines.push(...sectionRanges[sectionName].lines);
//         // Пропускаем соответствующие строки в новом конфиге
//         i = this.skipSection(newLines, i);
//       } else {
//         finalLines.push(line);
//       }
//     } else {
//       finalLines.push(line);
//     }
//   }
  
//   return finalLines.join('\n');
// };

// Вспомогательная функция для пропуска секции в новом конфиге
this.skipSection = function(lines, startIndex) {
  let depth = 0;
  let i = startIndex;
  
  for (; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^\s*/)[0].length;
    
    if (i === startIndex) {
      depth = indent;
      continue;
    }
    
    // Проверяем, закончилась ли секция
    if (indent <= depth && line.trim() !== '' && !line.match(/^\s/)) {
      break;
    }
  }
  
  return i - 1;
};

  this.resetSettings = function() {
    var self = this;
    if (confirm('Вы уверены, что хотите восстановить настройки по умолчанию?')) {
      fetch(this.defaultConfigPath)
        .then(function(response) {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.text();
        })
        .then(function(content) {
          if (self.editor) {
            // Полностью заменяем содержимое редактора
            self.editor.setValue(content);
            
            // Парсим и обновляем UI
            const themeConfig = self.parseThemeConfig(content);
            self.updateThemeControls(themeConfig);
            
            if (window.showNotification) {
              showNotification('Настройки восстановлены', 'info');
            }
          }
        })
        .catch(function(error) {
          console.error('Ошибка восстановления:', error);
          if (window.showNotification) {
            showNotification('Ошибка восстановления настроек', 'error');
          }
        });
    }
  };

  this.init();
}
