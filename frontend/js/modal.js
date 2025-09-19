const SideModals = {
  currentModal: null,
  modalButtons: [],
  backupLoader: null,

  /**
   * Инициализация боковых модальных окон
   */
  init: function() {
    this.createModalButtons();
    this.setupEventListeners();
    this.createBackupLoader();
  },

    /**
   * Создание лоадера для операций с бэкапами
   */
  createBackupLoader: function() {
    const loader = document.createElement('div');
    loader.className = 'backup-loader';
    loader.style.display = 'none';
    loader.innerHTML = `
      <div class="backup-loader-spinner"></div>
      <div class="backup-loader-text">Обработка...</div>
      <div class="backup-loader-progress">
        <div class="backup-loader-progress-bar"></div>
      </div>
    `;
    document.body.appendChild(loader);
    this.backupLoader = loader;
  },

  /**
   * Показать лоадер
   */
  showLoader: function(text = 'Обработка...', progress = 0) {
    if (this.backupLoader) {
      this.backupLoader.style.display = 'flex';
      this.backupLoader.querySelector('.backup-loader-text').textContent = text;
      this.backupLoader.querySelector('.backup-loader-progress-bar').style.width = progress + '%';
    }
  },

  /**
   * Скрыть лоадер
   */
  hideLoader: function() {
    if (this.backupLoader) {
      this.backupLoader.style.display = 'none';
    }
  },

  /**
   * Обновить прогресс лоадера
   */
  updateLoaderProgress: function(progress, text = null) {
    if (this.backupLoader) {
      const progressBar = this.backupLoader.querySelector('.backup-loader-progress-bar');
      if (progressBar) {
        progressBar.style.width = progress + '%';
      }
      if (text) {
        this.backupLoader.querySelector('.backup-loader-text').textContent = text;
      }
    }
  },

  /**
   * Создание кнопок для открытия модальных окон
   */
  createModalButtons: function() {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'side-modal-buttons';
    
    const buttons = [
      { id: 'toggle-preview', icon: 'mdi-eye', title: 'Переключить превью'},
      { id: 'settings-modal-btn', icon: 'mdi-cog', title: 'Настройки' },
      { id: 'help-modal-btn', icon: 'mdi-help-circle', title: 'Помощь' },
      { id: 'info-modal-btn', icon: 'mdi-information', title: 'Информация' }
    ];

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = 'side-modal-button';
      button.id = btn.id;
      button.title = btn.title;
      button.innerHTML = `<i class="mdi ${btn.icon}"></i>`;
      buttonsContainer.appendChild(button);
      this.modalButtons.push(button);
    });

    document.body.appendChild(buttonsContainer);
  },

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners: function() {
    // Обработчики для кнопок
    document.addEventListener('click', (e) => {
      if (e.target.closest('.side-modal-button')) {
        const button = e.target.closest('.side-modal-button');
        this.handleButtonClick(button);
      }
    });

    // Закрытие по клику вне модального окна
    document.addEventListener('click', (e) => {
      if (this.currentModal && !e.target.closest('.side-modal-content') && 
          !e.target.closest('.side-modal-button')) {
        this.removeModal();
      }
    });

    // Обработчик для кнопки превью
    document.getElementById('toggle-preview')?.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем всплытие события
      const preview = document.getElementById('preview-container');
      const editor = document.querySelector('.editor-container');
      
      if (preview && editor) {
        preview.classList.toggle('hidden');
        editor.classList.toggle('full-width');
        
        // Меняем иконку
        const icon = e.currentTarget.querySelector('i');
        if (icon) {
          icon.className = preview.classList.contains('hidden') 
            ? 'mdi mdi-eye-off' 
            : 'mdi mdi-eye';
        }
      }
    });

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.removeModal();
      }
    });
  },

  togglePreviewVisibility: function() {
      const previewContainer = document.getElementById('preview-container');
      const editorContainer = document.querySelector('.editor-container');
      const toggleBtn = document.getElementById('toggle-preview');
      
      if (!previewContainer || !editorContainer || !toggleBtn) return;
      
      const isHidden = previewContainer.classList.toggle('hidden');
      editorContainer.classList.toggle('full-width', isHidden);
      
      // Обновляем иконку
      const icon = toggleBtn.querySelector('i');
      if (icon) {
          icon.className = isHidden ? 'mdi mdi-eye-off' : 'mdi mdi-eye';
      }
      
      // Обновляем title
      toggleBtn.title = isHidden ? 'Show Preview' : 'Hide Preview';
      
      // Если превью стало видимым - обновляем его
      if (!isHidden && window.Preview) {
          Preview.refresh();
      }
  },

  /**
   * Обработка клика по кнопкам модальных окон
   * @param {HTMLElement} button - Нажатая кнопка
   */
  handleButtonClick: async function(button) {
      // Закрываем текущее модальное окно если оно открыто
      if (this.currentModal) {
        this.removeModal();
        return;
      }

      let modalContent = '';
      let modalTitle = '';

      // Определяем контент в зависимости от нажатой кнопки
      switch(button.id) {
        case 'settings-modal-btn':
          modalTitle = 'Настройки';
          modalContent = await this.getSettingsContent(); // Добавляем await
          break;
        case 'help-modal-btn':
          modalTitle = 'Помощь';
          modalContent = this.getHelpContent();
          break;
        case 'info-modal-btn':
          modalTitle = 'Информация';
          modalContent = this.getInfoContent();
          break;
        default:
          modalTitle = 'Модальное окно';
          modalContent = '<p>Содержимое модального окна</p>';
      }

      // Создаем модальное окно
      const modal = this.createModal(modalTitle, modalContent);

      if (button.id === 'help-modal-btn') {
        setTimeout(buildHelpMenu, 50); // даём время на вставку HTML
      }

      // Если это кнопка превью - не открываем модальное окно
      if (button.id === 'toggle-preview') {
          this.togglePreviewVisibility();
          return;
      }
      
      // Специальная обработка для окна настроек
      if (button.id === 'settings-modal-btn') {
         this.setupSettingsHandlers();
      }
      
      // Добавляем обработчик закрытия по клику на крестик
      modal.querySelector('.close-side-modal').addEventListener('click', () => {
          // Восстанавливаем предыдущую тему если изменения не сохранены
          if (button.id === 'settings-modal-btn' && window.Editor && Editor.cmInstance) {
              const currentTheme = localStorage.getItem('editorTheme') || 'material';
              Editor.cmInstance.setOption('theme', currentTheme);
          }
          this.removeModal();
      });
  },

  setupSettingsHandlers: function() {
    const modal = this.currentModal;
    if (!modal) return;
    
    // Получаем элементы управления с проверкой на существование
    const themeSelect = modal.querySelector('#editor-theme');
    const saveBtn = modal.querySelector('#save-settings');
    
    if (!themeSelect || !saveBtn) return;

    // Загружаем текущие настройки из localStorage
    const currentTheme = localStorage.getItem('editorTheme') || 'material';
    
    // Устанавливаем текущие значения
    themeSelect.value = currentTheme;

    // Обработчик сохранения настроек
    saveBtn.addEventListener('click', () => {
        const theme = themeSelect.value;
        
        // Проверяем, изменились ли настройки
        const themeChanged = theme !== currentTheme;
        
        // Сохраняем настройки
        localStorage.setItem('editorTheme', theme);
        
        // Применяем изменения через Editor если он доступен
        if (window.Editor) {
            // Применяем тему без перезагрузки
            if (themeChanged && Editor.cmInstance) {
                Editor.cmInstance.setOption('theme', theme);
            }
        }
        
        // Закрываем модальное окно
        this.removeModal();
        
        // Показываем уведомление об успешном сохранении
        showNotification('Настройки успешно сохранены', 'success');
    });
    
    // Обработчик загрузки фавикона
    document.getElementById('upload-favicon-btn')?.addEventListener('click', () => {
      document.getElementById('favicon-upload').click();
    });

    // Обработчик загрузки фавикона
    const uploadFaviconBtn = modal.querySelector('#upload-favicon-btn');
    const faviconUpload = modal.querySelector('#favicon-upload');
    
    if (uploadFaviconBtn && faviconUpload) {
      uploadFaviconBtn.addEventListener('click', () => {
        faviconUpload.click();
      });
      
      faviconUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const formData = new FormData();
          formData.append('favicon', file);
          
          const response = await fetch('/editor/api/upload-favicon', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(await response.text() || 'Upload failed');
          }
          
          this.renderSettingsModal();
          showNotification('Фавикон успешно загружен', 'success');
        } catch (err) {
          console.error('Favicon upload error:', err);
          showNotification(`Ошибка загрузки фавикона: ${err.message}`, 'error');
        }
      });
    }

    // Обработчик удаления фавикона
    const removeFaviconBtn = modal.querySelector('#remove-favicon-btn');
    if (removeFaviconBtn) {
      removeFaviconBtn.addEventListener('click', async () => {
        try {
          console.log('Attempting to remove favicon...'); // Добавьте это
          const response = await fetch('/editor/api/favicon', { 
            method: 'DELETE'
          });
          
          if (!response.ok) {
            console.error('Delete failed, status:', response.status); // Добавьте это
            throw new Error('Delete failed');
          }
          
          this.renderSettingsModal();
          showNotification('Фавикон удален', 'success');
        } catch (err) {
          //console.error('Favicon delete error:', err);
          showNotification('Ошибка удаления фавикона', 'error');
        }
      });
    }

    // Загружаем список бэкапов только если есть контейнер
    const backupList = modal.querySelector('#backup-list');
    if (backupList) {
      this.renderBackups();
      this.setupBackupHandlers();
    }

    // Обработчик загрузки бэкапа
    const uploadBackupBtn = modal.querySelector('#upload-backup-btn');
    const backupUpload = modal.querySelector('#backup-upload');
    
    if (uploadBackupBtn && backupUpload) {
      uploadBackupBtn.addEventListener('click', () => {
        backupUpload.click();
      });
      
      backupUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
      try {
        // ПОКАЗЫВАЕМ ЛОАДЕР ПРИ ЗАГРУЗКЕ
        this.showLoader('Загрузка бэкапа...', 10);
        
        const formData = new FormData();
        formData.append('backup', file);
        
        const response = await fetch('/editor/api/backups/upload', {
          method: 'POST',
          body: formData
        });
        
        // ОБНОВЛЯЕМ ПРОГРЕСС
        this.updateLoaderProgress(60, 'Сохранение файла...');
        
        if (!response.ok) {
          throw new Error(await response.text() || 'Upload failed');
        }
        
        // ОБНОВЛЯЕМ ПРОГРЕСС
        this.updateLoaderProgress(100, 'Завершение...');
        
        const result = await response.json();
        
        // СКРЫВАЕМ ЛОАДЕР ЧЕРЕЗ 1 СЕКУНДУ
        setTimeout(() => {
          this.hideLoader();
          this.renderBackups();
          showNotification(`Бэкап ${result.backup.name} успешно загружен`, 'success');
        }, 1000);
        
      } catch (err) {
        // СКРЫВАЕМ ЛОАДЕР ПРИ ОШИБКЕ
        this.hideLoader();
        console.error('Backup upload error:', err);
        showNotification(`Ошибка загрузки бэкапа: ${err.message}`, 'error');
      }
    });
    }

    // Обработчик создания бэкапа
    const createBackupBtn = modal.querySelector('#create-backup-btn');
    if (createBackupBtn) {
      createBackupBtn.addEventListener('click', async () => {
        try {
          const backupName = await this.createBackup();
          this.renderBackups();
          showNotification(`Бэкап ${backupName} создан`, 'success');
        } catch (err) {
          //console.error('Backup creation error:', err);
          showNotification('Ошибка создания бэкапа', 'error');
        }
      });
    }
  },

  // Добавить новый метод для обновления модального окна настроек
  renderSettingsModal: function() {
    if (this.currentModal && this.currentModal.querySelector('.side-modal-header h3').textContent === 'Настройки') {
      const modalBody = this.currentModal.querySelector('.side-modal-body');
      modalBody.innerHTML = this.getSettingsContent();
      this.setupSettingsHandlers();
    }
  },

  /**
   * Создание бокового модального окна
   */
  createModal: function(title, content) {
    if (this.currentModal) {
      this.removeModal();
    }
  
    const modal = document.createElement('div');
    modal.className = 'side-modal';

    // В методе createModal добавьте:
    if (title === 'Помощь') {
        modal.classList.add('side-modal-help');
    }

    modal.innerHTML = `
      <div class="side-modal-content">
        <div class="side-modal-header">
          <h3>${title}</h3>
          <button class="close-side-modal">&times;</button>
        </div>
        <div class="side-modal-body">${content}</div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;
    
    modal.querySelector('.close-side-modal').addEventListener('click', () => {
      this.removeModal();
    });
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    return modal;
  },

  /**
   * Удаление модального окна
   */
  removeModal: function() {
    if (this.currentModal) {
      this.currentModal.classList.remove('show');
      
      setTimeout(() => {
        if (this.currentModal && this.currentModal.parentNode) {
          this.currentModal.remove();
        }
        this.currentModal = null;
      }, 300);
    }
  },

  /**
   * Контент для окна настроек
   */
  getSettingsContent: async function() {
    const themes = [
      'material', 'material-darker', 'dracula', 
      'eclipse', 'monokai', 'solarized', 'ambiance'
    ];

    // Проверяем существование фавикона через API
    let faviconExists = false;
    try {
      const response = await fetch('/editor/api/check-favicon');
      if (response.ok) {
        const data = await response.json();
        faviconExists = data.exists;
      }
    } catch (err) {
      console.error('Error checking favicon:', err);
    }
    
    // Возвращаем HTML строку
    return `
      <div class="settings-section">
        <h4>Внешний вид</h4>
        <div class="form-group">
          <label>Тема редактора:</label>
          <select id="editor-theme" class="form-control">
          ${themes.map(theme => 
            `<option value="${theme}">${theme}</option>`
          ).join('')}
          </select>
          <button id="save-settings" class="btn-primary">Сохранить</button>
        </div>
        <div class="form-group favicon-container">
          <label>Фавикон:</label>
            ${faviconExists ? `
              <img src="/assets/favicon.ico?${Date.now()}" class="favicon-preview" alt="Current favicon">
            ` : ''}
            <input type="file" id="favicon-upload" accept=".ico" style="display: none;">
            <button id="upload-favicon-btn" class="btn-secondary">
              ${faviconExists ? 'Заменить' : 'Загрузить'} фавикон
            </button>
            ${faviconExists ? `
              <button id="remove-favicon-btn" class="btn-danger">
                Удалить
              </button>
            ` : ''}
        </div>
        
        <div class="backup-section">
          <h4>Управление бэкапами</h4>
          <h5>Загрузить бэкап</h5>
          <input type="file" id="backup-upload" accept=".zip" style="display: none;">
          <button id="upload-backup-btn" class="btn-secondary">
            <i class="mdi mdi-upload"></i> Загрузить бэкап
          </button>
          <h5>Создать бэкап</h5>
          <button id="create-backup-btn" class="btn-primary">
            Создать бэкап
          </button>
          <h5>Список бэкапов</h5>
          <div class="backup-list" id="backup-list">
            <!-- Список бэкапов будет загружен здесь -->
          </div>
        </div>
      </div>
    `;
  },

  loadBackups: async function() {
      try {
          const response = await fetch('/editor/api/backups'); // Добавляем /editor/
          if (!response.ok) throw new Error('Failed to load backups');
          return await response.json();
      } catch (err) {
          console.error('Error loading backups:', err);
          return [];
      }
  },

    /**
   * Восстановление из бэкапа
   */
  restoreBackup: async function(fileName) {
    try {
      const response = await fetch(`/editor/api/backups/restore?name=${encodeURIComponent(fileName)}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(errorText || 'Failed to restore backup');
        }
        throw new Error(errorData.error || errorData.message || 'Failed to restore backup');
      }
      
      const result = await response.json();
      return result; // ВОЗВРАЩАЕМ ВЕСЬ ОБЪЕКТ РЕЗУЛЬТАТА
    } catch (err) {
      console.error('Backup restoration error:', err);
      throw new Error(err.message || 'Ошибка при восстановлении бэкапа');
    }
  },

  /**
   * Обработчик восстановления бэкапа
   */
  setupBackupHandlers: function() {
    const backupList = document.getElementById('backup-list');
    if (!backupList) return;

    backupList.addEventListener('click', async (e) => {
      const target = e.target.closest('.download-backup') || 
                    e.target.closest('.delete-backup') ||
                    e.target.closest('.restore-backup');
      
      if (!target) return;
      
      const fileName = target.dataset.file;
      
      if (target.classList.contains('download-backup')) {
        this.downloadBackup(fileName);
      } else if (target.classList.contains('delete-backup')) {
        try {
          await this.deleteBackup(fileName);
          await this.renderBackups();
          showNotification(`Бэкап ${fileName} удален`, 'success');
        } catch (err) {
          showNotification('Ошибка удаления бэкапа', 'error');
        }
      } else if (target.classList.contains('restore-backup')) {
        // Сначала проверяем возможность восстановления
        try {
          const checkResponse = await fetch(`/editor/api/backups/check-restore?name=${encodeURIComponent(fileName)}`);
          const checkResult = await checkResponse.json();
          
          if (!checkResult.canRestore) {
            showNotification(`Ошибка прав доступа: ${checkResult.message}`, 'error');
            return;
          }
          
          // Подтверждение восстановления
          if (confirm(`Вы уверены, что хотите восстановить бэкап "${fileName}"? Все текущие данные будут заменены.`)) {
            // ПОКАЗЫВАЕМ ЛОАДЕР
            this.showLoader(`Восстановление бэкапа "${fileName}"...`, 10);
            
            try {
              const response = await fetch(`/editor/api/backups/restore?name=${encodeURIComponent(fileName)}`, {
                method: 'POST'
              });
              
              // ОБНОВЛЯЕМ ПРОГРЕСС
              this.updateLoaderProgress(50, 'Распаковка архива...');
              
              if (!response.ok) {
                throw new Error('Failed to restore backup');
              }
              
              // ОБНОВЛЯЕМ ПРОГРЕСС
              this.updateLoaderProgress(80, 'Копирование файлов...');
              
              const result = await response.json();
              
              // ОБНОВЛЯЕМ ПРОГРЕСС
              this.updateLoaderProgress(100, 'Завершение...');
              
              if (result.success) {
              // ИСПОЛЬЗУЕМ СООБЩЕНИЕ С ИМЕНЕМ АРХИВА ИЗ СЕРВЕРА
              showNotification(result.message || `Бэкап "${result.backupName}" успешно восстановлен`, 'success');
                
                // СКРЫВАЕМ ЛОАДЕР ЧЕРЕЗ 1 СЕКУНДУ
                setTimeout(() => {
                  this.hideLoader();
                  
                  // ДОБАВЛЯЕМ ПРОВЕРКУ ФЛАГА RELOAD
                  if (result.reload) {
                    // Перезагружаем страницу через 3 секунды
                    setTimeout(() => {
                      window.location.reload(true); // Принудительная перезагрузка
                    }, 3000);
                  } else {
                    // Если нет флага reload, просто обновляем данные
                    setTimeout(() => {
                      if (window.FileManager) FileManager.loadFiles();
                      if (window.Navigation) Navigation.loadNavigation();
                    }, 1000);
                  }
                }, 1000);
              }
              
            } catch (err) {
              // СКРЫВАЕМ ЛОАДЕР ПРИ ОШИБКЕ
              this.hideLoader();
              console.error('Backup restoration error:', err);
              showNotification('Ошибка восстановления бэкапа: ' + err.message, 'error');
            }
          }
        } catch (err) {
          this.hideLoader();
          showNotification('Ошибка проверки прав доступа', 'error');
        }
      }
    });
  },
  
  renderBackups: async function() {
    const backups = await this.loadBackups();
    const backupList = document.getElementById('backup-list');
    
    if (!backupList) return;
    
    if (backups.length === 0) {
      backupList.innerHTML = '<p>Нет доступных бэкапов</p>';
      return;
    }
    
    backupList.innerHTML = backups.map(backup => {
      const date = new Date(backup.date).toLocaleString();
      const size = (backup.size / (1024 * 1024)).toFixed(2); // в MB
      
      return `
        <div class="backup-item">
          <div>
            <strong>${backup.name}</strong><br>
            <small>${date} (${size} MB)</small>
          </div>
          <div class="backup-actions">
            <button class="btn-download download-backup" data-file="${backup.name}">
              Скачать
            </button>
            <button class="btn-restore restore-backup" data-file="${backup.name}">
              Восстановить
            </button>
            <button class="btn-del delete-backup" data-file="${backup.name}">
              Удалить
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  createBackup: async function() {
    try {
      // ПОКАЗЫВАЕМ ЛОАДЕР ПРИ СОЗДАНИИ БЭКАПА
      this.showLoader('Создание бэкапа...', 10);
      
      const response = await fetch('/editor/api/backups', {
        method: 'POST'
      });
      
      // ОБНОВЛЯЕМ ПРОГРЕСС
      this.updateLoaderProgress(40, 'Архивирование файлов...');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create backup');
      }
      
      // ОБНОВЛЯЕМ ПРОГРЕСС
      this.updateLoaderProgress(80, 'Сохранение архива...');
      
      const data = await response.json();
      
      // ОБНОВЛЯЕМ ПРОГРЕСС
      this.updateLoaderProgress(100, 'Завершение...');
      
      // СКРЫВАЕМ ЛОАДЕР ЧЕРЕЗ 1 СЕКУНДУ
      setTimeout(() => {
        this.hideLoader();
        this.renderBackups();
      }, 1000);
      
      return data.backup;
    } catch (err) {
      // СКРЫВАЕМ ЛОАДЕР ПРИ ОШИБКЕ
      this.hideLoader();
      console.error('Backup creation error:', err);
      throw err;
    }
  },

  deleteBackup: async function(fileName) {
    try {
      // ПОКАЗЫВАЕМ ЛОАДЕР ПРИ УДАЛЕНИИ
      this.showLoader('Удаление бэкапа...', 50);
      
      const response = await fetch(`/editor/api/backups?name=${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });
      
      // ОБНОВЛЯЕМ ПРОГРЕСС
      this.updateLoaderProgress(100, 'Завершение...');
      
      if (!response.ok) throw new Error('Failed to delete backup');
      
      // СКРЫВАЕМ ЛОАДЕР ЧЕРЕЗ 0.5 СЕКУНДЫ
      setTimeout(() => {
        this.hideLoader();
      }, 500);
      
      return true;
    } catch (err) {
      // СКРЫВАЕМ ЛОАДЕР ПРИ ОШИБКЕ
      this.hideLoader();
      console.error('Error deleting backup:', err);
      throw err;
    }
  },

  downloadBackup: function(fileName) {
    window.location.href = `/editor/api/backups/download?name=${encodeURIComponent(fileName)}`;
  },

  /**
   * Контент для окна помощи
   */
  getHelpContent: function() {
    return `
      <div class="help-section">
        <div class="help-container">

          <!-- Плавающее меню -->

          <nav class="help-menu">
            <ul id="help-toc"></ul>
          </nav>

          <!-- Основной контент Help -->
          <div class="help-content">
          
          <h4>Горячие клавиши</h4>
          <div class="help-table">
            <table>
              <tr><th><strong>Комбинация</strong></th><th>Действие</th></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Enter</kbd></td><td>Сохранить файл</td></tr>
              <tr><td><kbd>F5</kbd></td><td>Обновить превью</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Space</kbd></td><td>Автодополнение</td></tr>
              
              <tr><th><strong>Блоки и шаблоны</strong></th><th>Действие</th></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>W</kbd></td><td>Вставить Warning</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>A</kbd></td><td>Вставить Abstract</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd></td><td>Вставить Tabs</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd></td><td>Вставить Foldable</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd></td><td>Вставить Code block</td></tr>
              
              <tr><th><strong>Заголовки</strong></th><th>Действие</th></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>1</kbd></td><td>Заголовок H1</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>2</kbd></td><td>Заголовок H2</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>3</kbd></td><td>Заголовок H3</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>4</kbd></td><td>Заголовок H4</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>5</kbd></td><td>Заголовок H5</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>6</kbd></td><td>Заголовок H6</td></tr>
            </table>
          </div>
          <h4>Форматирование в CodeMirror</h4>
          <div class="help-table">
            <h5>Мультикурсор</h5>
            <table>
              <tr><th>Комбинация</th><th>Действие</th></tr>
              <tr><td><kbd>Alt</kbd> + <kbd>ЛКМ</kbd></td><td>Добавить курсор</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd></td><td>Добавить курсор выше</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd></td><td>Добавить курсор ниже</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd></td><td>Курсоры в конец строк выделения</td></tr>
              <tr><td><kbd>Alt</kbd> + перетаскивание</td><td>Вертикальное выделение</td></tr>
              <tr><td><kbd>Esc</kbd></td><td>Очистить все курсоры</td></tr>
            </table>
            <h5>Действие с курсором</h5>
            <table>
              <tr><th>Комбинация</th><th>Действие</th></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>D</kbd></td><td>Удалить строку где находится курсор</td></tr>
            </table>
            <h5>Отступы</h5>
            <table>
              <tr><th>Комбинация</th><th>Действие</th></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>}</kbd></td><td>Выделить строку и сдвинуть в лево</td></tr>
              <tr><td><kbd>Ctrl</kbd> + <kbd>{</kbd></td><td>Выделить строку и сдвинуть в право</td></tr>
            </table>
          </div>

          <div class="help-text">
            <p><strong>Советы:</strong></p>
            <ul>
              <li>Удерживайте <kbd>Ctrl</kbd> и кликайте ЛКМ для добавления курсоров</li>
              <li><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd> - курсоры в конец строк выделения</li>
              <li>Для вертикального выделения удерживайте <kbd>Alt</kbd> и строго вертикально перетаскивайте мышью</li>
              <li>Множественные курсоры работают со всеми операциями редактирования</li>
            </ul>
          </div>

          <h4>Синтаксис Markdown</h4>
          <p>Сдандартный синтаксис <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noopener">Markdown</a> поддерживается полностью. Ниже приведены примеры наиболее часто используемых элементов разметки:</p>
          <div class="markdown-reference">
            
            <div class="ref-item">
              <h5>Заголовки</h5>
              <div class="help-text">
                <p>В синтаксисе Markdown есть шесть уровней заголовков: от H1 (самого большого) до H6 (самого маленького).</p>
                <ul>
                    <li>Для выделения заголовков используют решётки <code>#</code></li>
                    <li>Решётки можно ставить как перед заголовком, так и с двух сторон от него</li>
                    <li>На уровень заголовка влияют только те <code>#</code>, которые находятся перед ним</li>
                    <li>Количество решёток соответствует уровню заголовка: одна для первого уровня, две для второго и так далее</li>
                    <li>Между решёткой и текстом ставится пробел</li>
                </ul>
                <p>Кнопка для вставки заголовков: <kbd><i class="mdi mdi-format-header-pound"></i><i class="mdi mdi-menu-down"></i></kbd></p>
              </div>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-header cm-header-1"># Заголовок первого уровня</span></div>
                  <div class="code-line"><span class="cm-header cm-header-2">## Заголовок второго уровня</span></div>
                  <div class="code-line"><span class="cm-header cm-header-3">### Заголовок третьего уровня</span></div>
                  <div class="code-line"><span class="cm-header cm-header-4">#### Заголовок четвёртого уровня</span></div>
                  <div class="code-line"><span class="cm-header cm-header-5">##### Заголовок пятого уровня</span></div>
                  <div class="code-line"><span class="cm-header cm-header-6">###### Заголовок шестого уровня</span></div>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Форматирование текста</h5>
              <div class="help-text">
                <p>Чтобы изменить начертание текста, нужно выделить его с двух сторон спецсимволами следующим образом: <code><спецсимвол>текст<спецсимвол></code></p>
                <ul>
                  <li>Кнопка для вставки жирного текста: <kbd><i class="mdi mdi-format-bold"></i></kbd></li>
                  <li>Для выделения текста курсивом нужно использовать одну звёздочку <code>*</code> или нижнее подчёркивание <code>_</code>. Кнопка для вставки курсивного текста: <kbd><i class="mdi mdi-format-italic"></i></kbd></li>
                  <li>Кнопка для вставки жирного курсива текста: <kbd><i class="mdi mdi-format-bold"></i><i class="mdi mdi-format-italic"></i></kbd></li>
                </ul>
                <strong>Пример</strong>
              </div>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-strong">**жирный текст**</span></div>
                  <div class="code-line"><span class="cm-em">*курсивный текст*</span></div>
                  <div class="code-line"><span class="cm-strong cm-em">***жирный курсив***</span></div>
                </div>
              </div>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-strong">__жирный текст__</span></div>
                  <div class="code-line"><span class="cm-em">_курсивный текст_</span></div>
                  <div class="code-line"><span class="cm-strong cm-em">___жирный курсив___</span></div>
                </div>
              </div>
              <div class="help-text">
              
              </div>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-strikethrough">~~зачеркнутый текст~~</span></div>
                  <div class="code-line"><span class="cm-highlight">==выделенный текст==</span></div>
                  <div class="code-line"><span class="cm-inline-code">\`встроенный код\`</span></div>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Списки</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-list">- Неупорядоченный список</span></div>
                  <div class="code-line"><span class="cm-list">  - Вложенный пункт</span></div>
                  <div class="code-line"><span class="cm-list cm-number">1. Упорядоченный список</span></div>
                  <div class="code-line"><span class="cm-list cm-number">2. Второй пункт</span></div>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Ссылки и изображения</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-link">[Текст ссылки](https://example.com)</span></div>
                  <div class="code-line"><span class="cm-link">![Alt текст](image.png)</span></div>
                  <div class="code-line"><span class="cm-link">[Внешняя ссылка :material-arrow-top-right:](url){:target='_blank'}</span></div>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Блоки кода</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-comment">\`\`\`python</span></div>
                  <div class="code-line"><span class="cm-keyword">def</span> <span class="cm-def">hello_world</span>():</div>
                  <div class="code-line">    <span class="cm-builtin">print</span>(<span class="cm-string">"Hello World"</span>)</div>
                  <div class="code-line"><span class="cm-comment">\`\`\`</span></div>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Цитаты</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-quote">> Цитата первого уровня</span></div>
                  <div class="code-line"><span class="cm-quote">> > Вложенная цитата</span></div>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Таблицы</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-table">| Заголовок 1 | Заголовок 2 |</span></div>
                  <div class="code-line"><span class="cm-table">|-------------|-------------|</span></div>
                  <div class="code-line"><span class="cm-table">| Ячейка 1    | Ячейка 2    |</span></div>
                  <div class="code-line"><span class="cm-table">| Ячейка 3    | Ячейка 4    |</span></div>
                </div>
              </div>
            </div>

            <div class="ref-item">
            <h4>Блоки для темы Material</h4>
            <!-- Admonitions - Блоки примечаний -->
            <div class="ref-item">
              <h5>Блоки примечаний (Admonitions)</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-admonition">!!! note</span></div>
                  <div class="code-line"><span class="cm-admonition">    Это обычное примечание</span></div>
                  <div class="code-line"><span class="cm-admonition">    С текстом внутри блока</span></div>
                </div>
              </div>
              <div class="admonition-example">
                <div class="admonition note">
                  <p class="admonition-title"><i class="mdi mdi-pencil-circle"></i><br>Note</p>
                  <p>Это обычное примечание</p>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Admonitions с заголовком</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-admonition">!!! note "Заголовок"</span></div>
                  <div class="code-line"><span class="cm-admonition">    Текст с пользовательским заголовком</span></div>
                </div>
              </div>
              <div class="admonition-example">
                <div class="admonition note">
                  <p class="admonition-title"><i class="mdi mdi-pencil-circle"></i><br>Заголовок</p>
                  <p>Это обычное примечание с пользовательским заголовком</p>
                </div>
              </div>
            </div>

            <div class="ref-item">
              <h5>Разные типы Admonitions</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-admonition cm-warning">!!! warning</span></div>
                  <div class="code-line"><span class="cm-admonition cm-warning">    Текст предупреждения</span></div>
                  <div class="code-line"></div>
                  <div class="code-line"><span class="cm-admonition">!!! tip</span></div>
                  <div class="code-line"><span class="cm-admonition">    Полезный совет</span></div>
                </div>
              </div>
              <div class="admonition-example">
                <div class="admonition warning">
                  <p class="admonition-title">Warning</p>
                  <p>Текст предупреждения</p>
                </div>
                <div class="admonition tip">
                  <p class="admonition-title">Tip</p>
                  <p>Полезный совет</p>
                </div>
              </div>
            </div>

            // Пример блоков
            <div class="admonition-example">
    <div class="admonition note">
      <div class="admonition-title"><i class="mdi mdi-pencil-circle"></i> Note / Примечание</div>
      <p>Это пример блока с заметкой.</p>
    </div>

    <div class="admonition abstract">
      <div class="admonition-title"><i class="mdi mdi-clipboard-text"></i> Abstract / Абстракция</div>
      <p>Краткое резюме или сводка.</p>
    </div>

    <div class="admonition info">
      <div class="admonition-title"><i class="fas fa-circle-info"></i> Info / Информация</div>
      <p>Справочная информация.</p>
    </div>

    <div class="admonition tip">
      <div class="admonition-title"><i class="mdi mdi-fire"></i> Tip / Совет</div>
      <p>Полезный совет для работы.</p>
    </div>

    <div class="admonition success">
      <div class="admonition-title"><i class="fas fa-check-circle"></i> Success / Успех</div>
      <p>Операция прошла успешно!</p>
    </div>

    <div class="admonition question">
      <div class="admonition-title"><i class="fas fa-question-circle"></i> Question / Вопрос</div>
      <p>А как это работает?</p>
    </div>

    <div class="admonition warning">
      <div class="admonition-title"><i class="fas fa-exclamation-triangle"></i> Warning / Предупреждение</div>
      <p>Будь осторожен!</p>
    </div>

    <div class="admonition failure">
      <div class="admonition-title"><i class="fas fa-times-circle"></i> Failure / Сбой</div>
      <p>Что-то пошло не так.</p>
    </div>

    <div class="admonition danger">
      <div class="admonition-title"><i class="mdi mdi-lightning-bolt-outline"></i> Danger / Опасность</div>
      <p>Опасное действие!</p>
    </div>

    <div class="admonition bug">
      <div class="admonition-title"><i class="mdi mdi-shield-bug-outline"></i> Bug / Ошибка</div>
      <p>Обнаружена ошибка в системе.</p>
    </div>

    <div class="admonition example">
      <div class="admonition-title"><i class="mdi mdi-test-tube"></i> Example / Пример</div>
      <p>Пример использования.</p>
    </div>

    <div class="admonition quote">
      <div class="admonition-title"><i class="mdi mdi-format-quote-close"></i> Quote / Цитата</div>
      <p>«Хороший код читается как хорошая книга»</p>
    </div>
  </div>

            // Конец Пример блоков

            <div class="ref-item">
              <h5>Сворачиваемые блоки (Collapsible)</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-foldable">??? note "Нажмите чтобы развернуть"</span></div>
                  <div class="code-line"><span class="cm-foldable">    Скрытый контент</span></div>
                  <div class="code-line"><span class="cm-foldable">    который можно развернуть</span></div>
                </div>
              </div>
              <div class="admonition-example">
                <details class="admonition note">
                  <summary>Нажмите чтобы развернуть</summary>
                  <p>Скрытый контент</p>
                  <p>который можно развернуть</p>
                </details>
              </div>
            </div>

            <div class="ref-item">
              <h5>Развернутые сворачиваемые блоки</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-foldable">???+ success "Изначально развернуто"</span></div>
                  <div class="code-line"><span class="cm-foldable">    Этот блок изначально виден</span></div>
                  <div class="code-line"><span class="cm-foldable">    но его можно свернуть</span></div>
                </div>
              </div>
              <div class="admonition-example">
                <details class="admonition success" open>
                  <summary>Изначально развернуто</summary>
                  <p>Этот блок изначально виден</p>
                  <p>но его можно свернуть</p>
                </details>
              </div>
            </div>


            <div class="ref-item">
              <h5>Вкладки</h5>
              <div class="code-example">
                <div class="code-editor">
                  <div class="code-line"><span class="cm-tab">=== "Вкладка 1"</span></div>
                  <div class="code-line"><span class="cm-tab">    Контент вкладки 1</span></div>
                  <div class="code-line"></div>
                  <div class="code-line"><span class="cm-tab">=== "Вкладка 2"</span></div>
                  <div class="code-line"><span class="cm-tab">    Контент вкладки 2</span></div>
                </div>
              </div>
            </div>

          </div>

          <h4>Иконки Material Design</h4>
          <div class="help-text">
            <p>Используйте синтаксис <code class="cm-inline-code">:material-icon-name:</code> для вставки иконок:</p>
            <div class="code-example">
              <div class="code-editor">
                <div class="code-line"><span class="cm-icon">:material-alert:</span> <span class="cm-icon">:material-check:</span> <span class="cm-icon">:material-heart:</span></div>
              </div>
            </div>
            <p>Доступны сотни иконок через кнопку <kbd class="mdi-kbd"><i class="mdi mdi-emoticon-outline"></i></kbd> на панели инструментов.</p>
          </div>
          </div> <!-- /help-content -->

        </div> <!-- /help-container -->  
      </div>
    `;
  },

  /**
   * Контент для информационного окна
   */
  getInfoContent: function() {
    return `
      <div class="info-section">
        <h4>О программе</h4>
        <p>Версия: 2.1.0</p>
        <p>Дата сборки: ${new Date().toLocaleDateString()}</p>
      </div>
    `;
  }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  SideModals.init();
});


// Создание оглавления и навигации по разделам в окне помощи
function buildHelpMenu() {
  const tocContainer = document.getElementById("help-toc");
  if (!tocContainer) return;

  tocContainer.innerHTML = "";

  const headings = document.querySelectorAll(".help-content h2, .help-content h3, .help-content h4, .help-content h5");

  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = "help-section-" + index;

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + heading.id;
    a.textContent = heading.textContent;
    li.appendChild(a);

    if (heading.tagName === "H4") li.style.marginLeft = "10px";
    if (heading.tagName === "H5") li.style.marginLeft = "20px";

    tocContainer.appendChild(li);
  });

  const menuLinks = tocContainer.querySelectorAll("a");

  function onScroll() {
    let scrollPos = window.scrollY + 120;
    headings.forEach((section) => {
      const id = section.id;
      if (id) {
        const offsetTop = section.offsetTop;
        const offsetBottom = offsetTop + section.offsetHeight;
        if (scrollPos >= offsetTop && scrollPos < offsetBottom) {
          menuLinks.forEach((a) => a.classList.remove("active"));
          const activeLink = document.querySelector(`.help-menu a[href="#${id}"]`);
          if (activeLink) activeLink.classList.add("active");
        }
      }
    });
  }

  window.addEventListener("scroll", onScroll);

  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}
