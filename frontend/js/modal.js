// modals.js
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

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.removeModal();
      }
    });
  },

  /**
   * Обработка клика по кнопке
   */
  handleButtonClick: function(button) {
    if (this.currentModal) {
      this.removeModal();
      return;
    }

    let modalContent = '';
    let modalTitle = '';

    switch(button.id) {
      case 'settings-modal-btn':
        modalTitle = 'Настройки';
        modalContent = this.getSettingsContent();
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

    const modal = this.createModal(modalTitle, modalContent);
    
    // Добавляем обработчики только для окна настроек
    if (button.id === 'settings-modal-btn') {
      const themeSelect = modal.querySelector('#editor-theme');
      if (themeSelect) {
        themeSelect.value = localStorage.getItem('editorTheme') || 'material';
      }

      const saveBtn = modal.querySelector('#save-settings');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const theme = themeSelect.value;
          localStorage.setItem('editorTheme', theme);
          if (window.Editor && Editor.cmInstance) {
            Editor.cmInstance.setOption('theme', theme);
          }
          this.removeModal();
        });
      }
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
  getSettingsContent: function() {
    const themes = [
      'material', 'ambiance', 'dracula', 'eclipse', 
      'material-darker', 'monokai', 'solarized'
    ];
    return `
      <div class="settings-section">
        <h4>Внешний вид</h4>
        <div class="form-group">
          <label>Тема:</label>
          <select id="editor-theme" class="form-control">
          ${themes.map(theme => 
            `<option value="${theme}">${theme}</option>`
          ).join('')}
          </select>
        </div>
      </div>
      <div class="settings-section">
        <h4>Редактор</h4>
        <div class="form-group">
          <label>
            <input type="checkbox" checked> Подсветка синтаксиса
          </label>
        </div>
      </div>
      <button id="save-settings" class="btn-primary">Сохранить</button>
    `;
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