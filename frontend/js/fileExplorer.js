const DRAG_STATES = {
  NONE: 0,
  DRAG_STARTED: 1,
  DROPPING: 2
};

const FileExplorer = {
  fileTree: null,
  fileTreeElement: null,
  currentFile: null,
  fileItems: [],
  currentModal: null,
  _isCreatingFile: false,
  dragState: DRAG_STATES.NONE,
  draggedItem: null,
  dropTarget: null,
  deleteBtn: null,

  /**
   * Инициализация файлового менеджера
   */
  init: async function() {
    this.fileTree = document.getElementById('file-tree');
    this.fileTreeElement = this.fileTree;
    this.deleteBtn = document.getElementById('delete-folder'); // Используем ваш ID
    if (this.deleteBtn) {
      this.deleteBtn.addEventListener('click', () => this.deleteFolder());
      this.deleteBtn.disabled = true;
    }
    
    if (!this.fileTree) {
      console.error('File tree element not found');
      return;
    }
    
    try {
      await this.loadFiles();
      this.setupEventListeners();
      this.updateFileItems();
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize file explorer');
    }
  },

  /**
   * Загрузка списка файлов с сервера
   */
  loadFiles: async function() {
    try {
      const response = await fetch('/editor/api/files');
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const files = await response.json();
      
      if (!Array.isArray(files)) {
        throw new Error('Invalid response format: expected array');
      }

      this.renderFileTree(files);
      return files;
    } catch (error) {
      console.error('Error loading files:', error);
      this.showError(`Failed to load files: ${error.message}`);
      throw error;
    }
  },

  /**
   * Отрисовка дерева файлов
   */
  renderFileTree: function(files) {
    this.fileTree.innerHTML = '';
    
    // Создаем корневой элемент
    const rootElement = this.createFileElement({
      name: 'Root',
      path: '',
      isDirectory: true
    });
    rootElement.classList.add('root-item');
    this.fileTree.appendChild(rootElement);
    
    const contentsDiv = document.createElement('div');
    contentsDiv.className = 'directory-contents';
    this.fileTree.appendChild(contentsDiv);
    
    if (!files || files.length === 0) {
      contentsDiv.innerHTML = '<div class="empty-message">Файлов и папок не обнаружено</div>';
      this.updateFileItems();
      return;
    }

    const tree = this.buildDirectoryStructure(files.filter(file => 
      !file.path.startsWith('images/') && !file.path.startsWith('assets/') // Исключаем папку images и assets
    ));
    this.renderDirectory(tree, contentsDiv);
    this.updateFileItems();
  },

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners: function() {
    // Обработчики для кнопок
    const refreshBtn = document.getElementById('refresh-files');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadFiles());
    }

    const newFileBtn = document.getElementById('new-file');
    if (newFileBtn) {
      newFileBtn.addEventListener('click', () => this.createNewFile());
    }

    const newDirBtn = document.getElementById('new-folder');
    if (newDirBtn) {
        newDirBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.createNewDirectory();
        });
    }

    // Обработчики для элементов дерева
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.file-item');
      if (!item) return;

      const isFolder = item.classList.contains('folder-item') || 
                      item.querySelector('.mdi-folder') ||
                      item.nextElementSibling?.classList.contains('directory-contents');

      if (isFolder) {
        this.handleFolderClick(item, e);
      } else {
        this.handleFileClick(item);
      }
    });
    document.addEventListener('dragstart', this.handleDragStart.bind(this));
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    document.addEventListener('dragleave', this.handleDragLeave.bind(this));
    document.addEventListener('drop', this.handleDrop.bind(this));
    document.addEventListener('dragend', this.handleDragEnd.bind(this));

    // Обработчик для кнопки удаления
    if (this.deleteBtn) {
      this.deleteBtn.addEventListener('click', () => {
        if (this.currentFile) {
          this.deleteFolder(this.currentFile);
        }
      });
    }
  },

  /**
   * Обработка начала перетаскивания
   */
  handleDragStart: function(e) {
      const item = e.target.closest('.file-item');
      if (!item || item.querySelector('.mdi-folder')) {
          e.preventDefault();
          return;
      }
      
      e.stopPropagation();
      this.dragState = DRAG_STATES.DRAG_STARTED; // Исправлено на DRAG_STARTED
      this.draggedItem = item;
      
      e.dataTransfer.setData('text/plain', item.dataset.path);
      e.dataTransfer.effectAllowed = 'move';
      
      item.classList.add('dragging');
      setTimeout(() => item.classList.add('drag-opacity'), 0);
  },

  /**
   * Обработка перетаскивания над элементом
   */
  handleDragOver: function(e) {
      if (this.dragState !== DRAG_STATES.DRAG_STARTED) return; // Исправлено на DRAG_STARTED
      
      const target = e.target.closest('.file-item');
      if (!target || !this.draggedItem || target === this.draggedItem) {
          return;
      }
      
      const isFolder = target.classList.contains('folder-item') || 
                      target.querySelector('.mdi-folder');
      
      if (isFolder) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          
          if (this.dropTarget && this.dropTarget !== target) {
              this.dropTarget.classList.remove('drop-target');
          }
          
          this.dropTarget = target;
          target.classList.add('drop-target');
      }
  },

  /**
   * Обработка выхода из элемента
   */
  handleDragLeave: function(e) {
    if (this.dragState !== DRAG_STATES.DRAGGING) return;
    
    const target = e.target.closest('.file-item');
    if (!target || !this.dropTarget || target !== this.dropTarget) {
      return;
    }
    
    target.classList.remove('drop-target');
    this.dropTarget = null;
  },

  /**
   * Обработка сброса элемента
   */
  handleDrop: async function(e) {
    if (this.dragState !== DRAG_STATES.DRAG_STARTED || !this.dropTarget) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const draggedPath = this.draggedItem.dataset.path;
    let targetFolder = this.dropTarget.dataset.path;
    
    // Если это корневая папка (Root)
    if (this.dropTarget.classList.contains('root-item')) {
      targetFolder = '';
    }
    
    try {
      this.dragState = DRAG_STATES.DROPPING;
      
      const pathParts = draggedPath.split('/');
      const fileName = pathParts.pop();
      
      let newPath;
      if (targetFolder) {
        const sourceDir = pathParts.join('/');
        if (targetFolder === sourceDir) {
          throw new Error('File is already in this directory');
        }
        newPath = `${targetFolder}/${fileName}`;
      } else {
        newPath = fileName;
      }
      
      const result = await this.moveFile(draggedPath, newPath);
      
      if (!result.success) {
        throw new Error(result.message || 'Move failed');
      }
      
      await this.loadFiles();
      this.highlightSelectedFile(newPath);
    } catch (error) {
      console.error('Error moving file:', error);
      this.showError(`Failed to move file: ${error.message}`);
    } finally {
      this.cleanupDrag();
    }
  },

  /**
   * Обработка завершения перетаскивания
   */
  handleDragEnd: function() {
    this.cleanupDrag();
  },

  /**
   * Очистка состояния перетаскивания
   */
  cleanupDrag: function() {
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging', 'drag-opacity');
    }
    
    if (this.dropTarget) {
      this.dropTarget.classList.remove('drop-target');
    }
    
    this.dragState = DRAG_STATES.NONE;
    this.draggedItem = null;
    this.dropTarget = null;
  },

  /**
   * Перемещение файла на сервере
   */
  moveFile: async function(oldPath, newPath) {
      try {
          const response = await fetch('/editor/api/move-file', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  oldPath,
                  newPath
              })
          });
          
          const result = await response.json();
          
          if (!response.ok || !result.success) {
              throw new Error(result.message || 'Failed to move file');
          }
          
          return result;
      } catch (error) {
          console.error('Error in moveFile:', error);
          throw error;
      }
  },

  /**
   * Обработка клика по папке
   */
  handleFolderClick: function(folderItem, event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.toggleFolder(folderItem);
    
    // Получаем путь из data-path атрибута
    const folderPath = folderItem.dataset.path;
    this.highlightSelectedFile(folderPath);
  },

  /**
   * Обработка клика по файлу
   */
  handleFileClick: function(fileItem) {
    const filePath = fileItem.dataset.path;
    this.loadFile(filePath);
    this.highlightSelectedFile(filePath);
  },


  /**
   * Обновление списка файлов
   */
  updateFileItems: function() {
    this.fileItems = Array.from(document.querySelectorAll('.file-item'));
    if (window.fileSearch && window.fileSearch.updateFileItems) {
      window.fileSearch.updateFileItems(this.fileItems);
    }
  },

  /**
   * Построение структуры директорий
   */
  buildDirectoryStructure: function(files) {
    const tree = {};
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            isDirectory: i < parts.length - 1 || file.isDirectory,
            children: {}
          };
        }
        
        currentLevel = currentLevel[part].children;
      }
    });
    
    return tree;
  },

  /**
   * Отрисовка директории
   */
  renderDirectory: function(directory, container, level = 0) {
    Object.keys(directory).forEach(key => {
      const item = directory[key];
      const itemElement = this.createFileElement(item);
      
      if (item.isDirectory) {
        const contentsDiv = document.createElement('div');
        contentsDiv.className = 'directory-contents';
        contentsDiv.style.display = 'none';
        
        container.appendChild(itemElement);
        container.appendChild(contentsDiv);
        
        this.renderDirectory(item.children, contentsDiv, level + 1);
        
        const icon = itemElement.querySelector('i');
        icon.className = 'mdi mdi-folder';
      } else {
        // Добавляем класс для вложенных файлов
        if (level > 0) {
          itemElement.classList.add('nested');
        }
        container.appendChild(itemElement);
      }
    });
  },

  /**
   * Создание элемента файла/папки
   */
  createFileElement: function(item) {
      const element = document.createElement('div');
      element.className = 'file-item';
      element.dataset.path = item.path;
      element.dataset.originalName = item.name;
      
      // Устанавливаем класс folder-item для папок и настраиваем draggable
      if (item.isDirectory) {
          element.classList.add('folder-item');
          element.draggable = false;
      } else {
          element.draggable = true;
      }

      const iconClass = item.isDirectory ? 'mdi mdi-folder' : 'mdi mdi-file-document-outline';
      
      element.innerHTML = `
          <div class="file-item-content">
              <i class="${iconClass}"></i>
              <span class="file-name">${item.name}</span>
          </div>
          ${!item.isDirectory ? 
              `<button class="delete-file-btn" title="Delete file">
                  <i class="mdi mdi-delete-outline"></i>
              </button>` 
              : ''}
      `;
      
      if (item.isDirectory) {
          // Для папок добавляем обработчик toggleDirectory
          element.addEventListener('click', (e) => {
              e.stopPropagation();
              this.toggleDirectory(e, element);
              this.highlightSelectedFile(item.path);
          });
      } else {
          // Для файлов добавляем обработчики
          element.addEventListener('click', () => {
              this.loadFile(item.path);
              this.highlightSelectedFile(item.path);
          });
          
          const deleteBtn = element.querySelector('.delete-file-btn');
          if (deleteBtn) {
              deleteBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  this.deleteFile(item.path);
              });
          }
      }
      
      return element;
  },

  /**
   * Переключение состояния папки (открыть/закрыть)
   */
  toggleFolder: function(folderItem) {
    const contents = folderItem.nextElementSibling;
    if (!contents?.classList.contains('directory-contents')) return;

    const isExpanded = contents.style.display === 'block';
    contents.style.display = isExpanded ? 'none' : 'block';
    folderItem.classList.toggle('expanded', !isExpanded);
    
    const icon = folderItem.querySelector('.mdi');
    if (icon) {
      icon.classList.toggle('mdi-folder', isExpanded);
      icon.classList.toggle('mdi-folder-open', !isExpanded);
    }
    
    // Обновляем состояние кнопки удаления при открытии/закрытии
    if (!isExpanded && this.deleteBtn) {
      const folderName = folderItem.querySelector('.file-name, span').textContent;
      const path = this.getFullPath(folderItem) + folderName + '/';
      this.currentFile = path;
      this.deleteBtn.disabled = false;
    }
  },

  toggleDirectory: function(e, element) {
    e.stopPropagation();
    const contents = element.nextElementSibling;
    if (contents && contents.classList.contains('directory-contents')) {
      const isHidden = contents.style.display === 'none';
      contents.style.display = isHidden ? 'block' : 'none';
      const icon = element.querySelector('i');
      icon.className = isHidden ? 'mdi mdi-folder-open' : 'mdi mdi-folder';
    }
  },

  /**
   * Получение полного пути к элементу
   */
  getFullPath: function(element) {
    let path = '';
    let current = element.parentElement;
    
    while (current && current !== this.fileTree) {
      if (current.classList.contains('directory-contents')) {
        const folderItem = current.previousElementSibling;
        if (folderItem) {
          const folderName = folderItem.querySelector('.file-name, span').textContent;
          path = `${folderName}/${path}`;
        }
      }
      current = current.parentElement;
    }
    
    return path;
  },

  /**
   * Загрузка файла
   */
  loadFile: async function(filePath) {
    try {
      //console.log('Requesting file:', filePath); // Лог запроса
      const response = await fetch(`/editor/api/file?path=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load file: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (typeof Editor !== 'undefined' && Editor.setContent) {
        Editor.setContent(data.content);
        Editor.setCurrentFile(filePath);
        this.highlightSelectedFile(filePath);
      } else {
        console.error('Editor module not available');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      this.showError(`Failed to load file: ${error.message}`);
    }
  },

  /**
   * Навигация к указанной папке
   */
  navigateToFolder: function(path) {
    if (!this.fileTree) return;

    // Закрываем все папки
    document.querySelectorAll('.directory-contents').forEach(el => {
      el.style.display = 'none';
    });

    // Сбрасываем иконки
    document.querySelectorAll('.mdi-folder-open').forEach(icon => {
      icon.classList.replace('mdi-folder-open', 'mdi-folder');
    });

    // Раскрываем путь
    let currentPath = '';
    (path || '').split('/').forEach(part => {
      if (!part) return;
      currentPath += `${part}/`;
      
      document.querySelectorAll('.file-item').forEach(item => {
        const nameElement = item.querySelector('.file-name, span');
        if (nameElement?.textContent === part) {
          const contents = item.nextElementSibling;
          if (contents?.classList.contains('directory-contents')) {
            contents.style.display = 'block';
            item.classList.add('expanded');
            item.querySelector('.mdi')?.classList.replace('mdi-folder', 'mdi-folder-open');
          }
        }
      });
    });
  },

  /**
   * Создание модального окна
   */
  createModal: function(title, content, buttons) {
    if (this.currentModal) {
      this.removeModal();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">${content}</div>
        <div class="modal-footer">${buttons}</div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;
    
    // Добавляем обработчик закрытия по крестику
    modal.querySelector('.close-modal').addEventListener('click', () => {
      this.removeModal();
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.removeModal();
      }
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
    return new Promise((resolve) => {
      if (this.currentModal) {
        this.currentModal.classList.remove('show');
        
        setTimeout(() => {
          if (this.currentModal?.parentNode) {
            this.currentModal.remove();
          }
          this.currentModal = null;
          resolve();
        }, 300);
      } else {
        resolve();
      }
    });
  },

  /**
   * Создание новой директории
   */
  createNewDirectory: async function() {
      if (this._isCreatingDirectory) return;
      this._isCreatingDirectory = true;
      
      try {
          const modal = this.createModal(
              'Создание новой папки',
              `
              <div class="form-group">
                  <label for="new-directory-name">Имя папки:</label>
                  <input type="text" id="new-directory-name" class="form-control" placeholder="Введите имя папки">
              </div>
              `,
              `
              <button type="button" id="cancel-create" class="btn-secondary">Отмена</button>
              <button type="button" id="confirm-create" class="btn-primary">Создать</button>
              `
          );

          const input = modal.querySelector('#new-directory-name');
          input.focus();

          const dirName = await new Promise((resolve) => {
              const cancel = () => {
                  this.removeModal();
                  resolve(null);
              };
              
              const confirm = () => {
                  const value = input.value.trim();
                  if (value) {
                      this.removeModal();
                      resolve(value);
                  } else {
                      input.classList.add('error');
                      setTimeout(() => input.classList.remove('error'), 500);
                  }
              };
              
              modal.querySelector('#cancel-create').addEventListener('click', cancel);
              modal.querySelector('#confirm-create').addEventListener('click', confirm);
              input.addEventListener('keypress', (e) => {
                  if (e.key === 'Enter') confirm();
              });
          });

          if (!dirName) return;

          const response = await fetch('/editor/api/directories', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({dirname: dirName})
          });

          if (!response.ok) throw new Error('Failed to create directory');
          
          await this.loadFiles();
          showNotification(`Папка "${dirName}" создана`, 'success');
          
      } catch (error) {
          console.error('Error:', error);
          showNotification(`Ошибка: ${error.message}`, 'error');
      } finally {
          this._isCreatingDirectory = false;
      }
  },

  /**
   * Создание нового файла
   */
  createNewFile: async function() {
    if (this._isCreatingFile) {
      console.log('File creation already in progress');
      return;
    }
    
    this._isCreatingFile = true;
    
    try {
      if (this.currentModal) {
        await this.removeModal();
      }

      const folders = this.getAllFolders();
      const modal = this.createModal('Create New File', `
        <div class="form-group">
          <label>File name:</label>
          <input type="text" id="new-file-name" placeholder="newfile.md" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Select folder:</label>
          <select id="new-file-folder" class="form-control">
            <option value="">(Root directory)</option>
            ${folders.map(f => 
              `<option value="${f.path}">${'&nbsp;&nbsp;'.repeat(f.level)}${f.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Tags (comma separated):</label>
          <input type="text" id="new-file-tags" placeholder="tag1, tag2" class="form-control">
        </div>
      `, `
        <button id="create-file-cancel" class="btn-secondary">Cancel</button>
        <button id="create-file-confirm" class="btn-primary">Create</button>
      `);

      const closeModal = async () => {
        await this.removeModal();
      };

      const assignHandler = (selector, handler) => {
        const element = modal.querySelector(selector);
        if (element) {
          element.addEventListener('click', handler);
        } else {
          console.error(`Element not found: ${selector}`);
        }
      };

      assignHandler('.close-modal', closeModal);
      assignHandler('#create-file-cancel', (e) => {
        e.stopPropagation();
        closeModal();
      });

      assignHandler('#create-file-confirm', async (e) => {
        e.stopPropagation();
        try {
          await this._createFile(modal);
          await closeModal();
        } catch (error) {
          console.error('Create error:', error);
          alert(`Error: ${error.message}`);
        }
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

    } catch (error) {
      console.error('Modal creation error:', error);
      await this.removeModal();
      alert(`Error: ${error.message}`);
    } finally {
      this._isCreatingFile = false;
    }
  },

  _createFile: async function(modal) {
    const getValue = (selector) => {
      const element = modal.querySelector(selector);
      return element?.value.trim();
    };

    const fileName = getValue('#new-file-name');
    if (!fileName) {
      showNotification('Пожалуйста, введите имя файла', 'error');
      throw new Error('Пожалуйста, введите имя файла');
    }

    const folderPath = getValue('#new-file-folder');
    const tags = getValue('#new-file-tags');
    const validName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
    const fullPath = folderPath ? `${folderPath}/${validName}` : validName;

    if (/[<>:"|?*]/.test(fullPath)) {
      showNotification('Недопустимые символы в пути файла', 'error');
      throw new Error('Invalid characters in file path');
    }

    try {
      const response = await fetch('/editor/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: fullPath,
          content: this.generateFileContent(tags)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        showNotification(`File already exists: ${fullPath}`, 'error');
        throw new Error(JSON.stringify(errorData));
      }

      const result = await response.json();
      showNotification(`File created successfully: ${fullPath}`, 'success');
      await this.loadFiles();
      await this.loadFile(fullPath);
    } catch (error) {
      console.error('Create error:', error);
      throw error;
    }
  },

  /**
   * Генерация содержимого нового файла
   */
  generateFileContent: function(tags) {
      // Если теги не указаны или строка состоит только из пробелов
      if (!tags || !tags.trim()) {
          return `# New File\n\nStart editing here...`;
      }

      // Обрабатываем теги
      const tagList = tags.split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0); // Удаляем пустые теги

      // Если после обработки не осталось валидных тегов
      if (tagList.length === 0) {
          return `# New File\n\nStart editing here...`;
      }

      // Формируем содержимое с тегами
      let content = '---\n';
      content += 'tags:\n';
      tagList.forEach(tag => {
          content += `  - ${tag}\n`;
      });
      content += '---\n\n# New File\n\nStart editing here...';

      return content;
  },

  /**
   * Получение списка всех папок
   */
  getAllFolders: function() {
    const folders = [];
    const walk = (node) => {
      Object.keys(node).forEach(key => {
        const item = node[key];
        if (item.isDirectory) {
          folders.push({ 
            name: item.name, 
            path: item.path,
            level: item.path.split('/').length - 1
          });
          walk(item.children);
        }
      });
    };
    
    const tree = this.buildDirectoryStructure(this.fileItems.map(item => ({
      path: item.dataset.path,
      isDirectory: item.querySelector('i').classList.contains('mdi-folder')
    })));
    
    walk(tree);
    return folders.sort((a, b) => a.path.localeCompare(b.path));
  },

    /**
   * Удаление файла или папки
   */
  // deleteFolder: async function(folderPath) {
  //   try {
  //     if (!folderPath) {
  //       throw new Error('Не выбрана папка для удаления');
  //     }

  //     // Проверяем, является ли выбранный элемент папкой
  //     const selectedItem = this.fileItems.find(item => item.dataset.path === folderPath);
  //     if (!selectedItem || !selectedItem.querySelector('.mdi-folder')) {
  //       throw new Error('Выбранный элемент не является папкой');
  //     }

  //     // Проверяем, пуста ли папка
  //     const isEmpty = await this.checkFolderEmpty(folderPath);
      
  //     if (!isEmpty) {
  //       const result = await this.handleNonEmptyFolder(folderPath);
  //       if (!result) return; // Пользователь отменил удаление
  //     } else {
  //       if (!confirm(`Вы уверены, что хотите удалить папку "${folderPath.split('/').pop()}"?`)) {
  //         return;
  //       }
  //     }

  //     const response = await fetch(`/editor/api/delete-folder?path=${encodeURIComponent(folderPath)}`, {
  //       method: 'DELETE'
  //     });

  //     if (!response.ok) {
  //       const error = await response.json();
  //       throw new Error(error.message || 'Не удалось удалить папку');
  //     }

  //     // Обновляем состояние
  //     if (this.currentFile === folderPath) {
  //       this.currentFile = null;
  //       if (this.deleteBtn) this.deleteBtn.disabled = true;
  //     }

  //     await this.loadFiles();
  //     showNotification(`Папка "${folderPath.split('/').pop()}" успешно удалена`);
      
  //   } catch (error) {
  //     console.error('Ошибка удаления папки:', error);
  //     this.showError(`Не удалось удалить папку: ${error.message}`);
  //   }
  // },
  /**
   * Удаление текущей выбранной папки
   */
  deleteFolder: async function() {
      if (this._isDeletingFolder) {
          console.log('Folder deletion already in progress');
          return;
      }
      
      try {
          this._isDeletingFolder = true;
          
          if (!this.currentFile) {
              showNotification('Не выбрана папка для удаления', 'error');
              return;
          }

          // Удаляем слеш в конце пути, если он есть
          const folderPath = this.currentFile.endsWith('/') 
              ? this.currentFile.slice(0, -1) 
              : this.currentFile;
          
          const folderName = folderPath.split('/').pop();

          // Создаем модальное окно для подтверждения
          const modal = this.createModal(
              'Подтверждение удаления',
              `Вы уверены, что хотите удалить папку "${folderName}" и всё её содержимое?`,
              `
              <button id="cancel-delete" class="btn-secondary">Отмена</button>
              <button id="confirm-delete" class="btn-danger">Удалить</button>
              `
          );

          // Ожидаем подтверждения пользователя
          const confirmed = await new Promise((resolve) => {
              modal.querySelector('#cancel-delete').addEventListener('click', () => {
                  this.removeModal();
                  resolve(false);
              });
              
              modal.querySelector('#confirm-delete').addEventListener('click', () => {
                  this.removeModal();
                  resolve(true);
              });
          });

          if (!confirmed) return;

          const response = await fetch(`/editor/api/delete-folder?path=${encodeURIComponent(folderPath)}`, {
              method: 'DELETE'
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || 'Ошибка сервера при удалении папки');
          }

          const result = await response.json();
          
          if (!result.success) {
              throw new Error(result.message || 'Не удалось удалить папку');
          }

          showNotification(`Папка "${folderName}" удалена`, 'success');
          await this.loadFiles();
          this.currentFile = null;
          this.deleteBtn.disabled = true;
          
      } catch (error) {
          console.error('Ошибка удаления папки:', error);
          showNotification(`Ошибка: ${error.message}`, 'error');
      } finally {
          this._isDeletingFolder = false;
      }
  },

  deleteFile: async function(filePath) {
    try {
      // Проверяем, является ли элемент папкой
      const isFolder = this.fileItems.find(item => 
        item.dataset.path === filePath && 
        item.querySelector('.mdi-folder')
      );

      let confirmMessage = `Вы уверены, что хотите удалить "${filePath.split('/').pop()}"?`;
      if (isFolder) {
        confirmMessage = `Вы уверены, что хотите удалить папку "${filePath.split('/').pop()}" и всё её содержимое?`;
      }

      if (!confirm(confirmMessage)) {
        return;
      }

      if (isFolder) {
        // Проверяем, пуста ли папка
        const isEmpty = await this.checkFolderEmpty(filePath);
        if (!isEmpty) {
          await this.handleNonEmptyFolder(filePath);
          return;
        }
      }

      const response = await fetch(`/editor/api/files?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Не удалось удалить: ${response.status}`);
      }

      if (this.currentFile === filePath) {
        if (typeof Editor !== 'undefined' && Editor.clear) {
          Editor.clear();
        }
        this.currentFile = null;
        if (this.deleteBtn) this.deleteBtn.disabled = true;
      }

      await this.loadFiles();
      this.updateFileItems();
      
      // Показываем уведомление об успешном удалении
      showNotification(`"${filePath.split('/').pop()}" успешно удален`);
    } catch (error) {
      console.error('Ошибка удаления:', error);
      this.showError(`Не удалось удалить: ${error.message}`);
    }
  },
  deleteItem: async function(path) {
    try {
      const isFolder = this.fileItems.find(item => 
        item.dataset.path === path && 
        item.querySelector('.mdi-folder')
      );
      
      if (isFolder) {
        const isEmpty = await this.checkFolderEmpty(path);
        
        if (!isEmpty) {
          const result = await this.handleNonEmptyFolder(path);
          if (!result) return;
        }
        
        if (!confirm(`Delete folder "${path.split('/').pop()}"?`)) {
          return;
        }
      } else {
        if (!confirm(`Delete file "${path.split('/').pop()}"?`)) {
          return;
        }
      }
      
      const response = await fetch(`/editor/api/${isFolder ? 'delete-folder' : 'files'}?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      if (this.currentFile === path) {
        if (typeof Editor !== 'undefined' && Editor.clear) {
          Editor.clear();
        }
        this.currentFile = null;
        if (this.deleteBtn) this.deleteBtn.disabled = true;
      }
      
      await this.loadFiles();
      showNotification(`${isFolder ? 'Folder' : 'File'} deleted successfully`);
    } catch (error) {
      console.error('Error deleting:', error);
      this.showError(`Failed to delete: ${error.message}`);
    }
  },

  // Добавим метод для показа уведомлений
  // showNotification: function(message) {
  //   const notification = document.createElement('div');
  //   notification.className = 'notification';
  //   notification.innerHTML = `
  //     <i class="mdi mdi-check-circle"></i>
  //     <span>${message}</span>
  //   `;
  //   document.body.appendChild(notification);
    
  //   setTimeout(() => {
  //     notification.classList.add('show');
  //   }, 10);
    
  //   setTimeout(() => {
  //     notification.classList.remove('show');
  //     setTimeout(() => notification.remove(), 300);
  //   }, 3000);
  // },
  showNotification: function(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconClass = type === 'success' ? 'mdi-check-circle' : 
                    type === 'error' ? 'mdi-alert-circle' : 'mdi-information';
    
    notification.innerHTML = `
      <i class="mdi ${iconClass}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  },

  /**
   * Проверка, пуста ли папка
   */
  checkFolderEmpty: async function(folderPath) {
    try {
      const response = await fetch(`/editor/api/folder-contents?path=${encodeURIComponent(folderPath)}`);
      if (!response.ok) throw new Error('Не удалось проверить папку');
      
      const contents = await response.json();
      return contents.files.length === 0 && contents.folders.length === 0;
    } catch (error) {
      console.error('Ошибка проверки папки:', error);
      return false;
    }
  },

  /**
   * Обработка непустой папки
   */
  handleNonEmptyFolder: async function(folderPath) {
      return new Promise((resolve) => {
          const folders = this.getAllFolders().filter(f => f.path !== folderPath);
          
          const modal = this.createModal(
              'Папка не пуста', 
              `
              <div class="form-group">
                  <p>Папка содержит файлы. Выберите действие:</p>
                  <div class="radio-group">
                      <label>
                          <input type="radio" name="folder-action" value="move" checked>
                          Переместить содержимое в другую папку
                      </label>
                      <label>
                          <input type="radio" name="folder-action" value="delete">
                          Удалить всё содержимое
                      </label>
                  </div>
                  <div id="move-folder-container">
                      <label>Выберите целевую папку:</label>
                      <select id="target-folder" class="form-control">
                          <option value="">(Корневая директория)</option>
                          ${folders.map(f => 
                              `<option value="${f.path}">${'&nbsp;&nbsp;'.repeat(f.level)}${f.name}</option>`
                          ).join('')}
                      </select>
                  </div>
              </div>
              `,
              `
              <button id="cancel-folder-delete" class="btn-secondary">Отмена</button>
              <button id="confirm-folder-delete" class="btn-primary">Подтвердить</button>
              `
          );

          // Обработчики для радио-кнопок
          modal.querySelectorAll('input[name="folder-action"]').forEach(radio => {
              radio.addEventListener('change', (e) => {
                  const moveContainer = modal.querySelector('#move-folder-container');
                  moveContainer.style.display = e.target.value === 'move' ? 'block' : 'none';
              });
          });

          // Обработчик отмены
          modal.querySelector('#cancel-folder-delete').addEventListener('click', () => {
              this.removeModal();
              resolve(false);
          });

          // Обработчик подтверждения
          modal.querySelector('#confirm-folder-delete').addEventListener('click', async () => {
              try {
                  const action = modal.querySelector('input[name="folder-action"]:checked').value;
                  const targetFolder = modal.querySelector('#target-folder')?.value || '';
                  
                  if (action === 'move' && !targetFolder && !confirm('Переместить в корневую директорию?')) {
                      return;
                  }

                  const response = await fetch('/editor/api/delete-folder', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          folderPath,
                          action,
                          targetFolder
                      })
                  });

                  if (!response.ok) throw new Error('Не удалось обработать папку');

                  await this.loadFiles();
                  this.removeModal();
                  resolve(true);
              } catch (error) {
                  console.error('Ошибка обработки папки:', error);
                  this.showError(`Ошибка: ${error.message}`);
                  resolve(false);
              }
          });
      });
  },

  /**
   * Подсветка выбранного файла/папки
   */
  highlightSelectedFile: function(filePath) {
    // Удаляем выделение у всех элементов
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.remove('selected', 'selected-folder');
    });

    // Находим выбранный элемент по точному совпадению пути
    const selectedItem = Array.from(this.fileItems).find(item => {
      const itemPath = item.dataset.path;
      // Сравниваем без учета слешей в конце
      const cleanItemPath = itemPath.endsWith('/') ? itemPath.slice(0, -1) : itemPath;
      const cleanFilePath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
      return cleanItemPath === cleanFilePath;
    });

    if (selectedItem) {
      const isFolder = selectedItem.classList.contains('folder-item') || 
                      selectedItem.querySelector('.mdi-folder');
      
      if (isFolder) {
        selectedItem.classList.add('selected-folder');
        if (this.deleteBtn) this.deleteBtn.disabled = false;
      } else {
        selectedItem.classList.add('selected');
        if (this.deleteBtn) this.deleteBtn.disabled = true;
      }
      this.currentFile = filePath;
    }
  },

  /**
   * Отображение ошибки
   */
  showError: function(message) {
    this.fileTree.innerHTML = `
      <div class="error-message">
        <i class="mdi mdi-alert-circle"></i>
        <span>${message}</span>
        <button id="retry-load" class="retry-button">Retry</button>
      </div>
    `;
    
    document.getElementById('retry-load').addEventListener('click', () => this.loadFiles());
  }
};

// Инициализация с проверкой готовности DOM
if (document.readyState === 'complete') {
  FileExplorer.init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    FileExplorer.init();
  });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  FileExplorer.init();
});
