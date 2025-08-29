const IconPicker = {
  modal: null,
  searchInput: null,
  iconGrid: null,
  currentCategory: 'all',
  allIcons: [],
  iconBtn: null,
  
  init: function() {
    this.createModal();
    this.createButton();
    this.setupEventListeners();
    this.loadIcons();
  },
  
  createModal: function() {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'icon-modal';
    modal.className = 'icon-modal';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="icon-modal-content">
        <div class="icon-modal-header">
          <h3>Выбор иконки</h3>
          <span class="icon-close">&times;</span>
        </div>
        <div class="icon-modal-body">
          <div class="icon-search-container">
            <input type="text" id="icon-search" placeholder="Поиск иконок...">
            <button id="clear-icon-search" title="Очистить поиск">
              <i class="mdi mdi-close"></i>
            </button>
          </div>
          <div class="icon-categories">
            <button class="icon-category-btn active" data-category="all">Все</button>
            <button class="icon-category-btn" data-category="material">Material</button>
            <button class="icon-category-btn" data-category="fontawesome">FontAwesome</button>
            <button class="icon-category-btn" data-category="octicons">Octicons</button>
            <button class="icon-category-btn" data-category="simple">Simple Icons</button>
          </div>
          <div class="icon-subcategories" id="icon-subcategories" style="display: none;">
            <select id="subcategory-filter" class="subcategory-filter">
              <option value="all">Все подкатегории</option>
              <!-- Подкатегории будут добавляться динамически -->
            </select>
          </div>
          <div id="icon-grid" class="icon-grid"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.modal = modal;
    this.searchInput = document.getElementById('icon-search');
    this.iconGrid = document.getElementById('icon-grid');
    this.subcategoryFilter = document.getElementById('subcategory-filter');
    this.subcategoriesContainer = document.getElementById('icon-subcategories');
  },

    createButton: function() {
    // Создаем кнопку для открытия модального окна
    this.iconBtn = document.createElement('button');
    this.iconBtn.id = 'icon-picker-btn';
    this.iconBtn.className = 'toolbar-btn format-btn';
    this.iconBtn.innerHTML = '<i class="mdi mdi-emoticon-outline"></i>';
    this.iconBtn.title = 'Вставить иконку';
    
    // Добавляем кнопку в тулбар (последнюю группу)
    const toolbarGroups = document.querySelectorAll('.markdown-toolbar .toolbar-group');
    if (toolbarGroups.length > 0) {
      const lastGroup = toolbarGroups[toolbarGroups.length - 1];
      lastGroup.appendChild(this.iconBtn);
    } else {
      // Если групп нет, создаем новую
      const toolbar = document.querySelector('.markdown-toolbar');
      if (toolbar) {
        const group = document.createElement('div');
        group.className = 'toolbar-group';
        group.appendChild(this.iconBtn);
        toolbar.appendChild(group);
      }
    }
  },
  
  setupEventListeners: function() {   
    this.iconBtn.onclick = () => this.openModal();
    // Закрытие модального окна
    this.modal.querySelector('.icon-close').onclick = () => this.closeModal();
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.closeModal();
    };
    
    // Поиск иконок
    this.searchInput.addEventListener('input', () => this.filterIcons());
    document.getElementById('clear-icon-search').onclick = () => {
      this.searchInput.value = '';
      this.filterIcons();
    };

    // Подкатегории
    this.subcategoryFilter.addEventListener('change', () => this.filterIcons());
    
    // Категории
    document.querySelectorAll('.icon-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.icon-category-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.dataset.category;
        this.updateSubcategories();
        this.filterIcons();
      });
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.closeModal();
      }
    });
  },
  
  openModal: function() {
    console.log('Opening icon modal');
    this.modal.style.display = 'block';
    this.searchInput.value = '';
    this.subcategoryFilter.value = 'all';
    this.updateSubcategories();
    this.searchInput.focus();
    this.filterIcons();
    
    document.body.style.overflow = 'hidden';
  },
  
  closeModal: function() {
    console.log('Closing icon modal'); // Добавим лог для отладки
    this.modal.style.display = 'none';
    document.body.style.overflow = '';
  },
  
  // loadIcons: function() {


  //   // FontAwesome с категориями (пример)
  //   const fontAwesomeIcons = [

  //   ];

  //   // Octicons и Simple Icons тоже добавляем с подкатегориями
  //   const octicons = [

  //   ];

  //   const simpleIcons = [
  //     { name: 'si si-github', category: 'simple', subcategory: 'Социальные сети и бренды' },
  //     { name: 'si si-google', category: 'simple', subcategory: 'Социальные сети и бренды' },
  //     // ...
  //   ];

  //   this.allIcons = [
  //     ...materialIcons,
  //     ...fontAwesomeIcons,
  //     ...octicons,
  //     ...simpleIcons
  //   ];
    
  //   this.renderIcons(this.allIcons);
  // },
  loadIcons: function() {
    // Загружаем иконки из отдельного файла
    this.allIcons = IconData.getAllIcons();
    this.renderIcons(this.allIcons);
  },
  
  renderIcons: function(icons) {
    this.iconGrid.innerHTML = '';
    
    if (icons.length === 0) {
      this.iconGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6c757d;">
          <i class="mdi mdi-magnify" style="font-size: 48px; margin-bottom: 10px;"></i>
          <p>Иконки не найдены</p>
        </div>
      `;
      return;
    }
    
    icons.forEach(icon => {
      const iconItem = document.createElement('div');
      iconItem.className = 'icon-item';
      iconItem.dataset.icon = icon.name;
      iconItem.dataset.category = icon.category;
      
      // ФИКС: Правильное формирование классов для всех типов иконок
      let iconClass = icon.name;
      if (icon.category === 'material') {
        iconClass = `mdi ${icon.name}`;
      } else if (icon.category === 'fontawesome') {
        // FontAwesome уже имеют правильный формат "fas fa-icon"
        iconClass = icon.name;
      } else if (icon.category === 'octicons') {
        // Octicons уже имеют правильный формат "octicon octicon-icon"  
        iconClass = icon.name;
      } else if (icon.category === 'simple') {
        // Simple Icons уже имеют правильный формат "si si-icon"
        iconClass = icon.name;
      }
      
      iconItem.innerHTML = `
        <div class="icon-modal-preview">
          <i class="${iconClass}"></i>
        </div>
        <div class="icon-name">${icon.name.split(' ').pop().replace(/^(mdi-|fa-|si-|octicon-)/, '')}</div>
      `;
      
      iconItem.addEventListener('click', () => this.insertIcon(icon.name));
      this.iconGrid.appendChild(iconItem);
    });
  },
  
  filterIcons: function() {
    const searchTerm = this.searchInput.value.toLowerCase();
    const selectedSubcategory = this.subcategoryFilter.value;
    
    let filteredIcons = this.allIcons;
    
    // Фильтр по основной категории
    if (this.currentCategory !== 'all') {
      filteredIcons = filteredIcons.filter(icon => icon.category === this.currentCategory);
    }
    
    // Фильтр по подкатегории
    if (selectedSubcategory !== 'all') {
      filteredIcons = filteredIcons.filter(icon => icon.subcategory === selectedSubcategory);
    }
    
    // Фильтр по поиску
    if (searchTerm) {
      filteredIcons = filteredIcons.filter(icon => 
        icon.name.toLowerCase().includes(searchTerm) ||
        icon.name.replace(/[^a-zA-Z]/g, '').toLowerCase().includes(searchTerm) ||
        (icon.subcategory && icon.subcategory.toLowerCase().includes(searchTerm))
      );
    }
    
    this.renderIcons(filteredIcons);
  },

  updateSubcategories: function() {
    const subcategories = new Set();
    
    if (this.currentCategory === 'all') {
      this.subcategoriesContainer.style.display = 'none';
      return;
    }
    
    // Собираем все подкатегории для выбранной категории
    this.allIcons.forEach(icon => {
      if (icon.category === this.currentCategory && icon.subcategory) {
        subcategories.add(icon.subcategory);
      }
    });
    
    // Обновляем выпадающий список
    this.subcategoryFilter.innerHTML = '<option value="all">Все подкатегории</option>';
    subcategories.forEach(subcategory => {
      const option = document.createElement('option');
      option.value = subcategory;
      option.textContent = subcategory;
      this.subcategoryFilter.appendChild(option);
    });
    
    this.subcategoriesContainer.style.display = 'block';
  },
  
  insertIcon: function(iconClass) {
    let iconSyntax = '';
    
    // Определяем синтаксис в зависимости от типа иконки
    if (iconClass.startsWith('mdi-')) {
      iconSyntax = `:material-${iconClass.replace('mdi-', '')}:`;
    } else if (iconClass.startsWith('fas ')) {
      const iconName = iconClass.replace('fas fa-', '');
      iconSyntax = `:fontawesome-solid-${iconName}:`;
    } else if (iconClass.startsWith('octicon ')) {
      const iconName = iconClass.replace('octicon octicon-', '');
      iconSyntax = `:octicons-${iconName}:`;
    } else if (iconClass.startsWith('si ')) {
      const iconName = iconClass.replace('si si-', '');
      iconSyntax = `:simple-${iconName}:`;
    } else {
      iconSyntax = `:${iconClass}:`;
    }
    
    // Вставляем в редактор используя метод insertAtCursor
    try {
      // Проверяем разные возможные пути до редактора
      if (window.Editor && window.Editor.insertAtCursor) {
        window.Editor.insertAtCursor(iconSyntax);
      } else if (window.Editor?.cmInstance) {
        // Прямая вставка в CodeMirror
        const doc = window.Editor.cmInstance.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(iconSyntax, cursor);
        window.Editor.cmInstance.focus();
      } else if (window.Editor?.editor) {
        // Вставка в обычный textarea
        const editor = window.Editor.editor;
        const startPos = editor.selectionStart;
        const endPos = editor.selectionEnd;
        editor.value = editor.value.substring(0, startPos) + 
                      iconSyntax + 
                      editor.value.substring(endPos);
        editor.focus();
      } else {
        console.error('Editor not available');
      }
    } catch (error) {
      console.error('Error inserting icon:', error);
    }
    
    this.closeModal();
  }

};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  IconPicker.init();
});

