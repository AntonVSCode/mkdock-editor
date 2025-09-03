// Функция для повторных попыток запросов
async function withRetry(fn, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Объявляем глобальную переменную только если она еще не существует
if (typeof window.IconDataLoaded === 'undefined') {
  window.IconDataLoaded = false;
}

// В начале файла добавьте
//let IconDataLoaded = false;

const IconPicker = {
  modal: null,
  searchInput: null,
  iconGrid: null,
  currentCategory: 'all',
  allIcons: [],
  iconBtn: null,
  favorites: [],
  
  init: function() {
    this.loadFavorites();
    this.createModal();
    //this.createButton(); 
    this.setupEventListeners();
    this.allIcons = []; // Пустой массив для начала
  },

  async loadFavorites() {
    try {
      const response = await withRetry(() => fetch('/editor/api/favorites'));
      if (response.ok) {
        this.favorites = await response.json();
        localStorage.setItem('iconPickerFavorites', JSON.stringify(this.favorites));
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
      const saved = localStorage.getItem('iconPickerFavorites');
      if (saved) this.favorites = JSON.parse(saved);
    }
  },
  
  async toggleFavorite(iconName) {
    const isCurrentlyFavorite = this.favorites.includes(iconName);
    
    try {
      if (isCurrentlyFavorite) {
        await withRetry(() => fetch(`/editor/api/favorites/${encodeURIComponent(iconName)}`, {
          method: 'DELETE'
        }));
        this.favorites = this.favorites.filter(name => name !== iconName);
      } else {
        await withRetry(() => fetch('/editor/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ iconName })
        }));
        this.favorites.push(iconName);
      }
      
      localStorage.setItem('iconPickerFavorites', JSON.stringify(this.favorites));
      this.filterIcons();
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      if (isCurrentlyFavorite) {
        this.favorites = this.favorites.filter(name => name !== iconName);
      } else {
        this.favorites.push(iconName);
      }
      localStorage.setItem('iconPickerFavorites', JSON.stringify(this.favorites));
      this.filterIcons();
    }
  },

  isFavorite: function(iconName) {
    return this.favorites.includes(iconName);
  },

  createModal: function() {
    const modal = document.createElement('div');
    modal.id = 'icon-modal';
    modal.className = 'icon-modal';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="icon-modal-content">
        <div class="icon-modal-header">
          <h3>Выбор иконки</h3>
          <div class="header-actions">
            <button id="toggle-favorites-view" class="favorites-toggle" title="Показать избранные">
              ⭐
            </button>
            <span class="icon-close">&times;</span>
          </div>
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
    this.favoritesToggle = document.getElementById('toggle-favorites-view');
  },
  
  setupEventListeners: function() {   
    this.iconBtn = document.getElementById('icon-picker-btn');
  
    if (this.iconBtn) {
      this.iconBtn.onclick = () => this.openModal();
    } else {
      console.warn('Icon picker button not found in HTML');
    }

    if (this.modal) {
      this.modal.querySelector('.icon-close').onclick = () => this.closeModal();
      this.modal.onclick = (e) => {
        if (e.target === this.modal) this.closeModal();
      };
    }
    
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterIcons());
    }
    
    const clearSearchBtn = document.getElementById('clear-icon-search');
    if (clearSearchBtn) {
      clearSearchBtn.onclick = () => {
        this.searchInput.value = '';
        this.filterIcons();
      };
    }

    if (this.subcategoryFilter) {
      this.subcategoryFilter.addEventListener('change', () => this.filterIcons());
    }
    
    // Переключение режима избранного
    if (this.favoritesToggle) {
      this.favoritesToggle.addEventListener('click', () => {
        this.toggleFavoritesView();
      });
    }
    
    document.querySelectorAll('.icon-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.icon-category-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.dataset.category;
        this.updateSubcategories();
        this.filterIcons();
      });
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display === 'block') {
        this.closeModal();
      }
    });
  },

  toggleFavoritesView: function() {
    const isFavoritesView = this.favoritesToggle.classList.contains('active');
    
    if (isFavoritesView) {
      // Возвращаемся к обычному виду
      this.favoritesToggle.classList.remove('active');
      this.favoritesToggle.title = 'Показать избранные';
      this.currentCategory = 'all';
      document.querySelector('.icon-category-btn[data-category="all"]').classList.add('active');
    } else {
      // Переключаемся на избранное
      this.favoritesToggle.classList.add('active');
      this.favoritesToggle.title = 'Показать все иконки';
      this.currentCategory = 'favorites';
      document.querySelectorAll('.icon-category-btn').forEach(b => b.classList.remove('active'));
    }
    
    this.filterIcons();
  },
  
  openModal: function() {
    //console.log('Opening icon modal');
    if (!this.modal) return;
    
    this.modal.style.display = 'block';
    this.searchInput.value = '';
    this.subcategoryFilter.value = 'all';
    this.favoritesToggle.classList.remove('active');
    this.favoritesToggle.title = 'Показать избранные';
    
    // Загружаем иконки только при открытии модального окна
    if (this.allIcons.length === 0) {
      this.loadIcons();
    } else {
      this.updateSubcategories();
      this.filterIcons();
    }
    
    if (this.searchInput) {
      this.searchInput.focus();
    }
    document.body.style.overflow = 'hidden';
  },
  
  closeModal: function() {
    //console.log('Closing icon modal');
    if (this.modal) {
      this.modal.style.display = 'none';
    }
    document.body.style.overflow = '';
  },
  
  loadIcons: function() {
    if (!this.iconGrid) return;
    
    this.iconGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6c757d;">
        <i class="mdi mdi-loading mdi-spin" style="font-size: 48px; margin-bottom: 10px;"></i>
        <p>Загрузка иконок...</p>
      </div>
    `;
    
    if (!window.IconDataLoaded && typeof IconData === 'undefined') {
      const script = document.createElement('script');
      script.src = 'js/iconData.js';
      script.onload = () => {
        window.IconDataLoaded = true;
        this.allIcons = IconData.getAllIcons();
        this.updateSubcategories();
        this.filterIcons();
      };
      document.head.appendChild(script);
    } else if (typeof IconData !== 'undefined') {
      setTimeout(() => {
        this.allIcons = IconData.getAllIcons();
        this.updateSubcategories();
        this.filterIcons();
      }, 300);
    }
  },
  
  renderIcons: function(icons) {
    if (!this.iconGrid) return;
    
    this.iconGrid.innerHTML = '';
    const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
    
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
      
      let iconClass = icon.name;
      if (icon.category === 'material') {
        iconClass = `mdi ${icon.name}`;
      } else if (icon.category === 'fontawesome') {
        iconClass = icon.name;
      } else if (icon.category === 'octicons') {
        iconClass = icon.name;
      } else if (icon.category === 'simple') {
        iconClass = icon.name;
      }
      
      const cleanIconName = icon.name.split(' ').pop().replace(/^(mdi-|fa-|si-|octicon-)/, '');
      
      let displayName = cleanIconName;
      if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        displayName = cleanIconName.replace(regex, '<mark>$1</mark>');
      }
      
      // Убираем кнопку избранного из каждой иконки
      iconItem.innerHTML = `
        <div class="icon-modal-preview">
          <i class="${iconClass}"></i>
        </div>
        <div class="icon-name">${displayName}</div>
      `;
      
      // Добавляем обработчик правой кнопки мыши для избранного
      iconItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.toggleFavorite(icon.name);
        
        // Визуальная обратная связь
        iconItem.classList.add('favorite-highlight');
        setTimeout(() => {
          iconItem.classList.remove('favorite-highlight');
        }, 500);
      });
      
      // Подсказка при наведении
      iconItem.title = 'Левый клик - вставить\nПравый клик - добавить в избранное';
      
      iconItem.addEventListener('click', (e) => {
        if (e.button === 0) { // Только левая кнопка мыши
          this.insertIcon(icon.name);
        }
      });
      
      this.iconGrid.appendChild(iconItem);
    });
  },
  
  filterIcons: function() {
    const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
    const selectedSubcategory = this.subcategoryFilter ? this.subcategoryFilter.value : 'all';
    
    let filteredIcons = this.allIcons;
    
    if (this.currentCategory === 'favorites' || (this.favoritesToggle && this.favoritesToggle.classList.contains('active'))) {
      filteredIcons = filteredIcons.filter(icon => this.favorites.includes(icon.name));
      if (this.subcategoriesContainer) {
        this.subcategoriesContainer.style.display = 'none';
      }
    } else if (this.currentCategory !== 'all') {
      filteredIcons = filteredIcons.filter(icon => icon.category === this.currentCategory);
    }
    
    if (selectedSubcategory !== 'all' && this.currentCategory !== 'favorites') {
      filteredIcons = filteredIcons.filter(icon => icon.subcategory === selectedSubcategory);
    }
    
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
    if (!this.subcategoriesContainer || !this.subcategoryFilter) return;
    
    const subcategories = new Set();
    
    if (this.currentCategory === 'all' || this.currentCategory === 'favorites') {
      this.subcategoriesContainer.style.display = 'none';
      return;
    }
    
    this.allIcons.forEach(icon => {
      if (icon.category === this.currentCategory && icon.subcategory) {
        subcategories.add(icon.subcategory);
      }
    });
    
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
    
    try {
      if (window.Editor && window.Editor.insertAtCursor) {
        window.Editor.insertAtCursor(iconSyntax);
      } else if (window.Editor?.cmInstance) {
        const doc = window.Editor.cmInstance.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(iconSyntax, cursor);
        window.Editor.cmInstance.focus();
      } else if (window.Editor?.editor) {
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
