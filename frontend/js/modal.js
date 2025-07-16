const SideModals = {
  currentModal: null,
  modalButtons: [],

  /**
   * Инициализация боковых модальных окон
   */
  init: function() {
    this.createModalButtons();
    this.setupEventListeners();
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
    const parserSelect = modal.querySelector('#markdown-parser');
    const saveBtn = modal.querySelector('#save-settings');
    
    if (!themeSelect || !parserSelect || !saveBtn) return;

    // Загружаем текущие настройки из localStorage
    const currentTheme = localStorage.getItem('editorTheme') || 'material';
    const currentParser = localStorage.getItem('markdownParser') || 'codemirror';
    
    // Устанавливаем текущие значения
    themeSelect.value = currentTheme;
    parserSelect.value = currentParser;

    // Обработчик сохранения настроек
    saveBtn.addEventListener('click', () => {
        const theme = themeSelect.value;
        const parser = parserSelect.value;
        
        // Проверяем, изменились ли настройки
        const themeChanged = theme !== currentTheme;
        const parserChanged = parser !== currentParser;
        
        // Сохраняем настройки
        localStorage.setItem('editorTheme', theme);
        localStorage.setItem('markdownParser', parser);
        
        // Применяем изменения через Editor если он доступен
        if (window.Editor) {
            // Применяем тему без перезагрузки
            if (themeChanged && Editor.cmInstance) {
                Editor.cmInstance.setOption('theme', theme);
            }
            
            // При изменении парсера - перезагружаем страницу
            if (parserChanged) {
                setTimeout(() => location.reload(), 300);
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
          const response = await fetch('/editor/api/favicon', { // Попробуйте без /editor
            method: 'DELETE'
          });
          
          if (!response.ok) {
            console.error('Delete failed, status:', response.status); // Добавьте это
            throw new Error('Delete failed');
          }
          
          this.renderSettingsModal();
          showNotification('Фавикон удален', 'success');
        } catch (err) {
          console.error('Favicon delete error:', err);
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

    // Обработчик создания бэкапа
  const createBackupBtn = modal.querySelector('#create-backup-btn');
    if (createBackupBtn) {
      createBackupBtn.addEventListener('click', async () => {
        try {
          const backupName = await this.createBackup();
          this.renderBackups();
          showNotification(`Бэкап ${backupName} создан`, 'success');
        } catch (err) {
          console.error('Backup creation error:', err);
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
    const parsers = [
      {value: 'codemirror', label: 'CodeMirror (встроенный)'},
      {value: 'marked', label: 'marked.js (более полный)'}
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
        </div>
        <div class="form-group">
          <label>Парсер:</label>
          <select id="markdown-parser" class="form-control">
            <option value="codemirror">CodeMirror (быстрый)</option>
            <option value="marked">marked.js (полный)</option>
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
        </div>
        
        <div class="backup-section">
          <h4>Управление бэкапами</h4>
          <button id="create-backup-btn" class="btn-primary">
            Создать бэкап
          </button>
          
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
            <button class="btn-secondary download-backup" data-file="${backup.name}">
              Скачать
            </button>
            <button class="btn-danger delete-backup" data-file="${backup.name}">
              Удалить
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  createBackup: async function() {
    try {
      const response = await fetch('/editor/api/backups', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create backup');
      }
      
      const data = await response.json();
      return data.backup;
    } catch (err) {
      console.error('Backup creation error:', err);
      throw err;
    }
  },

  deleteBackup: async function(fileName) {
    try {
      const response = await fetch(`/editor/api/backups?name=${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete backup');
      return true;
    } catch (err) {
      console.error('Error deleting backup:', err);
      throw err;
    }
  },

  downloadBackup: function(fileName) {
    window.location.href = `/editor/api/backups/download?name=${encodeURIComponent(fileName)}`;
  },

  // Обновленный обработчик для бэкапов
  setupBackupHandlers: function() {
    const backupList = document.getElementById('backup-list');
    if (!backupList) return;

    backupList.addEventListener('click', async (e) => {
      const target = e.target.closest('.download-backup') || e.target.closest('.delete-backup');
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
      }
    });
  },

  /**
   * Контент для окна помощи
   */
  getHelpContent: function() {
    return `
      <div class="help-section">
        <h4>Горячие клавиши</h4>
        <ul>
          <li><strong>Ctrl+S</strong> - Сохранить файл</li>
          <li><strong>Ctrl+N</strong> - Новый файл</li>
          <li><strong>Ctrl+D</strong> - Удалить файл</li>
        </ul>
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
        <p>Версия: 1.0.0</p>
        <p>Дата сборки: ${new Date().toLocaleDateString()}</p>
      </div>
    `;
  }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  SideModals.init();
});