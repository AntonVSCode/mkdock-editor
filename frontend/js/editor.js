const Editor = {
  editor: null,
  cmInstance: null, // Добавляем ссылку на экземпляр CodeMirror
  currentFile: null,
  currentFilePath: null,
  fileHeader: null,
  breadcrumbsContainer: null,
  currentFileElement: null,
  previewTimeout: null,
  saveTimeout: null,

  /**
   * Инициализация редактора
   */
  init: function() {
    // Проверяем, не инициализирован ли уже редактор
    if (this.cmInstance) {
      return;
    }

    const container = document.getElementById('markdown-editor-container');
    const textarea = document.getElementById('markdown-editor');
  
    // Удаляем предыдущий экземпляр CodeMirror, если он существует
    if (!container || !textarea) {
      console.error('Editor elements not found');
      return;
    }

  try {
    // Удаляем предыдущий экземпляр, если есть
    const previousEditor = container.querySelector('.CodeMirror');
    if (previousEditor) {
      previousEditor.remove();
    }

    this.cmInstance = CodeMirror(container, {
      value: textarea.value || '',
      mode: {
        //name: "htmlmixed",            // Режим Markdown
        name: "markdown",            // Режим Markdown
        highlightFormatting: true,   // Подсветка форматирования
        htmlMode: true               // Для корректного автозакрытия HTML-тегов
      },
      //theme: localStorage.getItem('editorTheme') || 'material', // Тема редактора, по умолчанию 'material'
      theme: 'material',             // Тема (если подключен material.css)
      lineNumbers: true,             // Показывать номера строк
      lineWrapping: true,            // Перенос строк
      autofocus: true,               // Автофокус на редакторе
      viewportMargin: Infinity,      // Полный размер видимой области
      autoCloseBrackets: true,       // Автозакрытие [], {}, ()
      autoCloseTags: true,           // Автозакрытие HTML-тегов
      viewportMargin: Infinity,      // Полный размер видимой области
      matchBrackets: true,           // Подсветка скобок
      indentUnit: 2,                 // Ширина отступа
      indentWithTabs: false,         // Использовать пробелы для отступов
      tabSize: 2,                    // Размер табуляции
      extraKeys: {
        "Ctrl-Space": "autocomplete",   // Горячая клавиша для подсказок
        "Ctrl-Enter": () => this.saveFile(),
        //"Ctrl-B": () => this.wrapSelection('**', '**'), // Горячая клавиша для жирного текста Пока не реализовано
        //"Ctrl-I": () => this.wrapSelection('*', '*'),   // Горячая клавиша для курсивного текста Пока не реализовано
        "F5": () => Preview.refresh(this.getContent())
      }
    });

      // Автоматическое обновление превью при изменениях
      this.cmInstance.on('change', () => {
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
          Preview.refresh(this.getContent());
        }, 500);
      });

      this.initMarkdownToolbar();
      this.setupEventListeners();
      this.initFileHeader();
      
    } catch (error) {
      console.error('CodeMirror init error:', error);
      // Fallback к обычному textarea
      textarea.style.display = 'block';
      this.editor = textarea;
      // this.setupEventListeners();
      // this.initFileHeader();
    }
  },

  /**
   * Инициализация компонента хлебных крошек
   */
  initFileHeader: function() {
    // Находим или создаем контейнер для хлебных крошек
    this.fileHeader = document.querySelector('.file-info-header');
    if (!this.fileHeader) return;
    
    this.breadcrumbsContainer = this.fileHeader.querySelector('.breadcrumbs');
    this.currentFileElement = this.fileHeader.querySelector('.filename');
    
    // Инициализируем обработчики кликов
    this.setupBreadcrumbs();
  },

  setupEventListeners: function() {
  // Добавляем проверки на существование элементов
    const imageUpload = document.getElementById('image-upload');
    if (!imageUpload) {
      console.warn('Image upload element not found');
      return;
    }
    if (imageUpload) {
      imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          const url = await this.uploadImage(file);
          if (url) {
            this.insertAtCursor(`![${file.name}](${url})`);
          }
        }
        e.target.value = '';
      });
    } else {
      console.warn('image-upload element not found');
    }
  },

  handleEditorInput: function() {
      clearTimeout(this.saveTimeout);
      clearTimeout(this.previewTimeout);

      this.saveTimeout = setTimeout(() => this.saveFile(), 1500);
      this.previewTimeout = setTimeout(async () => {
        const previewContainer = document.getElementById('preview-container');
        if (!previewContainer || !previewContainer.classList.contains('hidden')) {
          await Preview.refresh(this.getContent());
        }
      }, 500);
      
      if (this.codemirror) {
        setTimeout(() => this.codemirror.refresh(), 100);
      }
  },

  initMarkdownToolbar: function() {
    document.querySelectorAll('.markdown-toolbar button').forEach(btn => {
      btn.addEventListener('click', () => {
        const textToInsert = btn.dataset.insert;
        this.insertAtCursor(textToInsert);
        this.resetTimers();
      });
    });
  },

  resetTimers: function() {
    clearTimeout(this.saveTimeout);
    clearTimeout(this.previewTimeout);
    this.saveTimeout = setTimeout(() => this.saveFile(), 1500);
  },

  setContent: function(content) {
    if (this.cmInstance) {
      this.cmInstance.setValue(content);
    } else {
      console.error('Editor not initialized');
    }
  },

  getContent: function() {
    return this.cmInstance?.getValue() || '';
  },

  /**
   * Устанавливает текущий файл и обновляет отображение
   * @param {string} filePath - Полный путь к файлу (например, "docs/folder/file.md")
   */
  setCurrentFile: function(filePath) {
    this.currentFile = filePath;
    this.currentFilePath = filePath;
    document.title = `${filePath} - MkDocs Editor`;
    this.updateFileHeader();
  },

  /**
   * Обновляет отображение хлебных крошек и имени файла
   */
  updateFileHeader: function() {
    if (!this.currentFilePath || !this.fileHeader) {
      if (this.currentFileElement) {
        this.currentFileElement.textContent = 'no file selected';
      }
      this.resetBreadcrumbs();
      return;
    }

    // Показываем имя файла справа
    const fileName = this.currentFilePath.split('/').pop();
    if (this.currentFileElement) {
      this.currentFileElement.textContent = fileName;
    }

    // Строим хлебные крошки слева
    this.buildBreadcrumbs();
  },

  /**
   * Сбрасывает хлебные крошки к начальному состоянию
   */
  resetBreadcrumbs: function() {
    if (!this.breadcrumbsContainer) return;
    
    this.breadcrumbsContainer.innerHTML = `
      <span class="crumb root-crumb" data-path="">
        <i class="mdi mdi-folder"></i> docs
      </span>
    `;
  },

  /**
   * Строит хлебные крошки на основе текущего пути
   */
  buildBreadcrumbs: function() {
    if (!this.breadcrumbsContainer) return;
    
    const parts = this.currentFilePath.split('/');
    let pathSoFar = '';
    
    let breadcrumbsHTML = `
      <span class="crumb root-crumb" data-path="">
        <i class="mdi mdi-folder"></i> docs
      </span>
    `;

    // Добавляем каждую папку в путь
    parts.slice(0, -1).forEach(part => {
      if (!part) return; // Пропускаем пустые части
      pathSoFar += `${part}/`;
      breadcrumbsHTML += `
        <span class="separator">/</span>
        <span class="crumb" data-path="${pathSoFar}">
          <i class="mdi mdi-folder"></i> ${part}
        </span>
      `;
    });

    this.breadcrumbsContainer.innerHTML = breadcrumbsHTML;
    this.setupBreadcrumbs();
  },

  /**
   * Настраивает обработчики кликов для хлебных крошек
   */
  setupBreadcrumbs: function() {
    if (!this.breadcrumbsContainer) return;
    
    this.breadcrumbsContainer.querySelectorAll('.crumb').forEach(crumb => {
      crumb.addEventListener('click', (e) => {
        const path = e.currentTarget.dataset.path;
        if (window.FileExplorer && FileExplorer.navigateToFolder) {
          FileExplorer.navigateToFolder(path);
        }
      });
    });
  },

  saveFile: async function() {
    if (!this.currentFile) return;

    try {
      const content = this.getContent();
      const response = await fetch('/editor/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: this.currentFile,
          content: content
        })
      });

      if (!response.ok) throw new Error('Save failed');
      
      // Обновляем превью после сохранения, если оно видимо
      const previewContainer = document.getElementById('preview-container');
      if (!previewContainer || !previewContainer.classList.contains('hidden')) {
        Preview.refresh(content);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      Preview.showError('Failed to save file');
    }
  },

  uploadImage: async function(file) {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/editor/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  },

  insertAtCursor: function(text) {
    if (!this.cmInstance) return;

    const doc = this.cmInstance.getDoc();
    const cursor = doc.getCursor();
    doc.replaceRange(text, cursor);
    this.cmInstance.focus();
  },

  debounce: function(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  Editor.init();
});
CodeMirror.defineMode("mkdocs-markdown", function(config) {
  const markdown = CodeMirror.getMode(config, "markdown");
  
  return {
    token: function(stream, state) {
      // Обработка admonitions
      if (stream.match(/^!!! \w+/)) {
        return "admonition";
      }
      if (stream.match(/^\?\?\? \w+/)) {
        return "admonition";
      }
      if (stream.match(/^=== /)) {
        return "tabset";
      }
      
      return markdown.token(stream, state);
    },
    startState: function() {
      return markdown.startState();
    },
    copyState: function(state) {
      return markdown.copyState(state);
    },
    indent: markdown.indent,
    blankLine: markdown.blankLine
  };
});