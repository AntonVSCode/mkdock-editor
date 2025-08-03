const Editor = {
  editor: null,                // Ссылка на текстовый редактор (для режима marked)
  cmInstance: null,            // Ссылка на экземпляр CodeMirror
  currentFile: null,           // Текущий открытый файл
  currentFilePath: null,       // Полный путь к текущему файлу
  fileHeader: null,            // Ссылка на заголовок с хлебными крошками
  breadcrumbsContainer: null,  // Контейнер для хлебных крошек
  currentFileElement: null,    // Элемент с именем текущего файла
  previewTimeout: null,        // Таймер для обновления превью
  saveTimeout: null,           // Таймер для автосохранения
  //typo: null,
  //typoEn: null,
  //spellcheckTimeout: null,

  /**
   * Инициализация редактора
   * на основе сохраненных настроек
   */
  init: function() {
    try {
      // Проверяем загружен ли CodeMirror
      if (!window.CodeMirror) {
        console.warn('CodeMirror не загружен, используется простой редактор');
        return this.initWithMarked();
      }

      // Загружаем настройки из localStorage
      const settings = this.loadSettings();
      const container = document.getElementById('markdown-editor-container');
      
      if (!container) {
        throw new Error('Контейнер редактора не найден');
      }

      // Инициализируем соответствующий парсер
      container.innerHTML = '<textarea id="markdown-editor"></textarea>';
      
      if (settings.markdownParser === 'marked') {
        this.initWithMarked();
      } else {
         this.initWithCodeMirror();
      }

      return this;
    } catch (error) {
      console.error('Ошибка инициализации редактора:', error);
      // Fallback на простой редактор
      return this.initWithMarked();
    }
  },

  /**
   * Загрузка настроек редактора из localStorage
   * @returns {object} Объект с настройками
   */
  loadSettings: function() {
    return {
      theme: localStorage.getItem('editorTheme') || 'material', // Тема редактора
      markdownParser: localStorage.getItem('markdownParser') || 'codemirror' // Выбранный парсер
    };
  },

  /**
   * Инициализация редактора с использованием CodeMirror
   * (более быстрый, но с базовой поддержкой Markdown)
   */
  initWithCodeMirror: function() {
    try {
      const container = document.getElementById('markdown-editor-container');
      const textarea = document.getElementById('markdown-editor');
      
      // Проверяем наличие необходимых элементов
      if (!container || !textarea) {
        throw new Error('Элементы редактора не найдены');
      }

      // Удаляем предыдущий экземпляр CodeMirror, если есть
      const previousEditor = container.querySelector('.CodeMirror');
      if (previousEditor) previousEditor.remove();

      // Получаем текущую тему из настроек
      const currentTheme = localStorage.getItem('editorTheme') || 'material';

      // Создаем экземпляр CodeMirror
      this.cmInstance = CodeMirror.fromTextArea(textarea, {
        mode: {
          name: "markdown",            // Режим Markdown
          highlightFormatting: true,   // Подсветка форматирования
          htmlMode: true               // Для корректного автозакрытия HTML-тегов
        },
        theme: currentTheme,           // Тема редактора
        lineNumbers: true,             // Показывать номера строк
        lineWrapping: true,            // Перенос строк
        autofocus: true,               // Автофокус на редакторе
        viewportMargin: Infinity,      // Полный размер видимой области
        autoCloseBrackets: true,       // Автозакрытие [], {}, ()
        autoCloseTags: true,           // Автозакрытие HTML-тегов
        matchBrackets: true,           // Подсветка скобок
        indentUnit: 2,                 // Ширина отступа
        indentWithTabs: false,         // Использовать пробелы для отступов
        tabSize: 2,                    // Размер табуляции
      });

      // Настройка событий
      this.setupCodeMirrorEvents();
      
      // Инициализация MaterialShortcuts (если он загружен)
      if (typeof MaterialShortcuts !== 'undefined') {
        this.materialShortcuts = MaterialShortcuts.init(this);
        // Инициализация обработчиков кнопок Material
      } else {
        console.warn('MaterialShortcuts не загружен, некоторые функции недоступны');
      }

      // Инициализируем остальные компоненты
      this.initFileHeader();
     
    } catch (error) {
      console.error('Ошибка инициализации CodeMirror:', error);
      // Если CodeMirror не загрузился - используем marked.js как fallback
      this.initWithMarked();
    }
  },

     setupCodeMirrorEvents: function() {
    // Обновляем тему редактора при изменении в других вкладках
    window.addEventListener('storage', (e) => {
      if (e.key === 'editorTheme' && this.cmInstance) {
        this.cmInstance.setOption('theme', e.newValue);
      }
    });

    // Автоматическое обновление превью при изменениях
    this.cmInstance.on('change', () => {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => {
        Preview.refresh(this.getContent());
      }, 500);
    });
  },

    /**
   * Инициализация редактора с использованием marked.js
   * (более полная поддержка Markdown, но менее интерактивный)
   */
  initWithMarked: function() {
    console.log('Initializing marked.js editor');
    const container = document.getElementById('markdown-editor-container');
    const textarea = document.getElementById('markdown-editor');
    
    // Очищаем контейнер и показываем обычный textarea
    container.innerHTML = '';
    container.appendChild(textarea);
    textarea.style.display = 'block';
    this.editor = textarea;

    // Загружаем highlight.js для превью
    this.loadHighlightJs().then(() => {
        // Настраиваем обработчик для обновления превью
        textarea.addEventListener('input', () => {
            Preview.refresh(textarea.value);
        });
        
        // Инициализируем превью с текущим содержимым
        Preview.refresh(textarea.value);
    }).catch(error => {
        console.error('Failed to load highlight.js:', error);
    });

    // Инициализируем остальные компоненты
    this.initFileHeader();
  },

  loadHighlightJs: function() {
      return new Promise((resolve, reject) => {
          // Если уже загружен
          if (typeof hljs !== 'undefined') {
              return resolve();
          }

          // Создаем элемент для стилей
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'assets/vendor/highlightjs/default.min.css';
          document.head.appendChild(link);

          // Загружаем скрипт highlight.js
          const script = document.createElement('script');
          script.src = 'assets/vendor/highlight.min.js';
          script.onload = () => {
              // Инициализируем подсветку
              if (typeof hljs !== 'undefined') {
                  hljs.highlightAll();
                  resolve();
              } else {
                  reject(new Error('hljs не был загружен'));
              }
          };
          script.onerror = () => {
              reject(new Error('Не удалось загрузить highlight.js'));
          };
          document.head.appendChild(script);
      });
  },

     /**
   * Сохранение настроек редактора
   * @param {string} theme - Название темы
   * @param {string} parser - Выбранный парсер (codemirror/marked)
   */
  saveSettings: function(theme, parser) {
    localStorage.setItem('editorTheme', theme);
    localStorage.setItem('markdownParser', parser);
    // Перезагружаем страницу для применения изменений
    location.reload();
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

  handleEditorInput: function() {
    clearTimeout(this.saveTimeout);
    clearTimeout(this.previewTimeout);

    this.saveTimeout = setTimeout(() => this.saveFile(), 1500);
    this.previewTimeout = setTimeout(async () => {
      const previewContainer = document.getElementById('preview-container');
      if (!previewContainer || !previewContainer.classList.contains('hidden')) {
        const content = this.getContent();
        await Preview.refresh(this.transformPathsForPreview(content));
      }
    }, 500);
    
    if (this.codemirror) {
      setTimeout(() => this.codemirror.refresh(), 100);
    }
  },

  applySettings: function(theme, parser) {
    // Сохраняем настройки
    localStorage.setItem('editorTheme', theme);
    localStorage.setItem('markdownParser', parser);
    
    // Применяем тему
    if (this.cmInstance) {
      this.cmInstance.setOption('theme', theme);
    }
    
    // Если парсер изменился - перезагружаем страницу
    const currentParser = localStorage.getItem('markdownParser');
    if (currentParser !== parser) {
      location.reload();
    }
  },

  /**
   * Сброс таймеров автосохранения и превью
   */
  resetTimers: function() {
    clearTimeout(this.saveTimeout);
    clearTimeout(this.previewTimeout);
    this.saveTimeout = setTimeout(() => this.saveFile(), 1500);
  },

  /**
   * Установка содержимого редактора
   * @param {string} content - Текст для вставки
   */
  setContent: function(content) {
    if (this.cmInstance) {
      // Для CodeMirror
      this.cmInstance.setValue(content);
    } else if (this.editor) {
      // Для обычного textarea (режим marked)
      this.editor.value = content;
    } else {
      console.error('Editor not initialized');
    }
  },

  /**
   * Получение содержимого редактора
   * @returns {string} Текущий текст
   */
  getContent: function() {
    if (this.cmInstance) {
      return this.cmInstance.getValue();
    } else if (this.editor) {
      return this.editor.value;
    }
    return '';
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

  saveFile: function() {
    return new Promise(async (resolve) => {
      if (!this.currentFile) {
        showNotification('Не удалось сохранить файл: файл не выбран', 'error');
        resolve();
        return;
      }

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

        if (!response.ok) {
          throw new Error('Save failed');
        }
        
        // Обновляем превью после сохранения, если оно видимо
        const previewContainer = document.getElementById('preview-container');
        if (!previewContainer || !previewContainer.classList.contains('hidden')) {
          Preview.refresh(content);
        }
        resolve();
      } catch (error) {
        showNotification('Не удалось сохранить файл', 'error');
        resolve(); // Все равно резолвим промис, так как ошибка уже обработана
      }
    });
  },

  // Добавим метод для преобразования путей при предпросмотре
  transformPathsForPreview: function(content) {
    // Заменяем относительные пути на абсолютные для предпросмотра
    return content.replace(/\]\(images\//g, '](/images/');
  },

  /**
   * Вставка текста в текущую позицию курсора
   * @param {string} text - Текст для вставки
   */
  insertAtCursor: function(text) {
    if (this.cmInstance) {
      // Для CodeMirror
      const doc = this.cmInstance.getDoc();
      const cursor = doc.getCursor();
      doc.replaceRange(text, cursor);
      this.cmInstance.focus();
    } else if (this.editor) {
      // Для обычного textarea
      const startPos = this.editor.selectionStart;
      const endPos = this.editor.selectionEnd;
      const currentText = this.editor.value;
      
      this.editor.value = currentText.substring(0, startPos) + 
                         text + 
                         currentText.substring(endPos);
      
      // Устанавливаем курсор после вставленного текста
      this.editor.selectionStart = this.editor.selectionEnd = startPos + text.length;
      this.editor.focus();
    }
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

// Кастомный режим для MkDocs (обработка admonitions и вкладок)
CodeMirror.defineMode("mkdocs-markdown", function(config) {
  const markdown = CodeMirror.getMode(config, "markdown");
  
  return {
    token: function(stream, state) {
      // Обработка admonitions (!!! note)
      if (stream.match(/^!!! \w+/)) {
        return "admonition";
      }
      // Обработка сворачиваемых блоков (??? note)
      if (stream.match(/^\?\?\? \w+/)) {
        return "admonition";
      }
      // Обработка вкладок (=== "Tab")
      if (stream.match(/^=== /)) {
        return "tabset";
      }
      
      // Стандартная обработка Markdown
      return markdown.token(stream, state);
    },
    startState: markdown.startState,
    copyState: markdown.copyState,
    indent: markdown.indent,
    blankLine: markdown.blankLine
  };
});

// Обработчики для выпадающих меню
function setupDropdowns() {
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    const btn = dropdown.querySelector('.dropbtn');
    const content = dropdown.querySelector('.dropdown-content');
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Закрываем все другие открытые меню
      document.querySelectorAll('.dropdown-content').forEach(otherContent => {
        if (otherContent !== content) {
          otherContent.style.display = 'none';
        }
      });
      // Переключаем текущее меню
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });
    
    // Обработчики для кнопок внутри меню
    content.querySelectorAll('.dropdown-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const textToInsert = btn.getAttribute('data-insert');
        if (textToInsert) {
          Editor.insertAtCursor(textToInsert);
        }
        content.style.display = 'none';
      });
    });
  });

  // Закрытие меню при клике вне его
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-content').forEach(content => {
      content.style.display = 'none';
    });
  });
}

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  Editor.init();
  setupDropdowns();
});