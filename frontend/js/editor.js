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
  initialized: false,          // Добавляем флаг инициализации
  /**
   * Инициализация редактора
   * на основе сохраненных настроек
   */
  init: function() {
    if (this.initialized) {
      console.warn('Editor уже инициализирован, пропускаем повторную инициализацию');
      return this;
    }

    try {
      console.group('[DEBUG] Initializing Editor');

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

    this.initialized = true;
    console.groupEnd();
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
      console.group('[DEBUG] Initializing CodeMirror');

      const container = document.getElementById('markdown-editor-container');
      const textarea = document.getElementById('markdown-editor');
      
      // Проверяем наличие необходимых элементов
      if (!container || !textarea) {
        throw new Error('Элементы редактора не найдены');
      }

      console.log('CodeMirror version:', CodeMirror.version);
      console.log('Available modes:', Object.keys(CodeMirror.modes));

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

      // Добавляем обработчик для клавиши Enter
      this.cmInstance.on("keydown", (cm, event) => {
        if (event.key === "Enter") {
          const doc = cm.getDoc();
          const cursor = doc.getCursor();
          const line = doc.getLine(cursor.line);
          
          // Проверяем, находимся ли мы внутри блока с отступом (admonition, code block и т.д.)
          const isInIndentedBlock = line.startsWith('    ');
          const isEmptyLine = line.trim() === '';
          const prevLine = cursor.line > 0 ? doc.getLine(cursor.line - 1) : '';
          const nextLine = cursor.line < doc.lineCount() - 1 ? doc.getLine(cursor.line + 1) : '';
          
          // Если текущая строка пустая и предыдущая строка с отступом, и следующая строка без отступа
          if (isEmptyLine && prevLine.startsWith('    ') && (!nextLine || !nextLine.startsWith('    '))) {
            // Выходим из блока - оставляем курсор в начале строки
            doc.replaceRange('\n', cursor);
            event.preventDefault();
            return;
          }
          
          if (isInIndentedBlock || (prevLine.startsWith('    ') && !isEmptyLine)) {
            // Внутри блока с отступом - сохраняем отступ
            setTimeout(() => {
              const newCursor = doc.getCursor();
              const newLine = doc.getLine(newCursor.line);
              
              if (newLine.trim() === '' && prevLine.startsWith('    ')) {
                // Если новая строка пустая - добавляем 4 пробела
                doc.replaceRange('    ', newCursor);
                doc.setCursor({
                  line: newCursor.line,
                  ch: 4
                });
              } else if (newLine.startsWith('    ')) {
                // Если строка уже с отступом - просто ставим курсор после отступа
                doc.setCursor({
                  line: newCursor.line,
                  ch: Math.min(newCursor.ch, 4)
                });
              }
            }, 10);
          }
        }
      });

      // Инициализируем множественные курсоры
      if (this.cmInstance) {
          MultiCursor.init(this.cmInstance);
      }

      // Настройка событий
      this.setupCodeMirrorEvents();
      
      // Инициализация MaterialShortcuts (если он загружен)
      if (typeof MaterialShortcuts !== 'undefined') {
        MaterialShortcuts.editor = this; // Просто сохраняем ссылку
      } else {
        console.warn('MaterialShortcuts не загружен, некоторые функции недоступны');
      }

      // Инициализируем остальные компоненты
      this.initFileHeader();
      console.groupEnd();
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
    // Экранируем HTML во всем контенте, кроме блоков кода
    const codeBlockRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;
    let result = '';
    
    // Обрабатываем каждый блок кода отдельно
    content.replace(codeBlockRegex, (match, offset) => {
      // Экранируем текст перед блоком кода
      result += this.escapeHtml(content.substring(lastIndex, offset));
      // Добавляем сам блок кода без экранирования
      result += match;
      lastIndex = offset + match.length;
      return match;
    });
    
    // Добавляем оставшийся текст после последнего блока кода
    result += this.escapeHtml(content.substring(lastIndex));
    
    // Заменяем относительные пути на абсолютные для предпросмотра
    return result.replace(/\]\(images\//g, '](/images/');
  },

  escapeHtml: function(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * Вставка текста в текущую позицию курсора
   * @param {string} text - Текст для вставки
   */

  insertAtCursor: function(text, positionAfterIndent = false) {
    if (this.cmInstance) {
      const doc = this.cmInstance.getDoc();
      const cursor = doc.getCursor();
      const lines = text.split('\n');
      
      doc.replaceRange(text, cursor);
      
      if (positionAfterIndent) {
        const contentLine = lines.findIndex(line => line.startsWith('    '));
        if (contentLine > -1) {
          doc.setCursor({
            line: cursor.line + contentLine,
            ch: 4
          });
        }
      }
      this.cmInstance.focus();
    } else if (this.editor) {
      const startPos = this.editor.selectionStart;
      const endPos = this.editor.selectionEnd;
      this.editor.value = this.editor.value.substring(0, startPos) + 
                        text + 
                        this.editor.value.substring(endPos);
      this.editor.focus();
    }
  },

  insertMultilineContent: function(content, positionCursorAfterIndent = true) {
    if (this.cmInstance) {
      const doc = this.cmInstance.getDoc();
      const cursor = doc.getCursor();
      const currentLine = doc.getLine(cursor.line);
      const lines = content.split('\n');
      
      // Если текущая строка не пуста, добавляем перенос
      const insertText = currentLine.trim() !== '' ? '\n' + content : content;
      doc.replaceRange(insertText, cursor);

      // Находим строку с контентом (4 пробела + текст)
      let contentLineIndex = -1;
      if (positionCursorAfterIndent) {
        contentLineIndex = lines.findIndex(line => 
          line.startsWith('    ') && line.trim().length > 4
        );
      }

      // Позиционируем курсор
      if (contentLineIndex !== -1) {
        const targetLine = cursor.line + contentLineIndex + (currentLine.trim() !== '' ? 1 : 0);
        doc.setCursor({ line: targetLine, ch: 4 }); // Курсор после 4 пробелов
      } else {
        const lastLine = cursor.line + lines.length - (currentLine.trim() !== '' ? 0 : 1);
        doc.setCursor({ line: lastLine, ch: doc.getLine(lastLine).length });
      }
      
      this.cmInstance.focus();
    } else if (this.editor) {
      // Реализация для обычного textarea
      const startPos = this.editor.selectionStart;
      const endPos = this.editor.selectionEnd;
      const currentText = this.editor.value;
      const isNewLineNeeded = startPos > 0 && !currentText.substring(startPos - 1, startPos).match(/[\r\n]/);
      
      let textToInsert = content.replace(/\\n/g, '\n');
      if (isNewLineNeeded) textToInsert = '\n' + textToInsert;
      
      this.editor.value = currentText.substring(0, startPos) + 
                        textToInsert + 
                        currentText.substring(endPos);
      
      const contentPos = textToInsert.indexOf('    ') + 4;
      this.editor.selectionStart = this.editor.selectionEnd = 
        contentPos > 3 ? startPos + contentPos : startPos + textToInsert.length;
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
    
    // Обработчик для всех кнопок
    content.querySelectorAll('.dropdown-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        content.style.display = 'none';
        
        const textToInsert = btn.getAttribute('data-insert');
        if (textToInsert) {
          if (textToInsert.startsWith('#') && 
              typeof MaterialShortcuts !== 'undefined' && 
              MaterialShortcuts.editor?.cmInstance) {
            console.log('Inserting heading via dropdown'); // Логирование
            MaterialShortcuts._insertHeading(
              MaterialShortcuts.editor.cmInstance, 
              textToInsert
            );
          }
          // Для admonitions и других блоков - обычная вставка с обработкой переносов
          else {
            const textWithNewlines = textToInsert.replace(/\\n/g, '\n');
            Editor.insertAtCursor(textWithNewlines);
          }
        }
      });
    });
  });
}

const MultiCursor = {
    init: function(cm) {
        this.cm = cm;
        this.setupMultiCursorKeys();
    },

    setupMultiCursorKeys: function() {
        this.cm.setOption('extraKeys', {
            // Ctrl+Alt+СтрелкаВверх - добавить курсор выше
            'Ctrl-Alt-Up': function(cm) {
                const selections = cm.listSelections();
                const newSelections = [];
                
                selections.forEach(selection => {
                    const head = selection.head;
                    
                    newSelections.push(selection);
                    
                    if (head.line > 0) {
                        const newPos = {
                            line: head.line - 1,
                            ch: head.ch
                        };
                        newSelections.push({
                            anchor: newPos,
                            head: newPos
                        });
                    }
                });
                
                cm.setSelections(newSelections);
                return true;
            },

            // Ctrl+Alt+СтрелкаВниз - добавить курсор ниже
            'Ctrl-Alt-Down': function(cm) {
                const selections = cm.listSelections();
                const newSelections = [];
                
                selections.forEach(selection => {
                    const head = selection.head;
                    
                    newSelections.push(selection);
                    
                    if (head.line < cm.lastLine()) {
                        const newPos = {
                            line: head.line + 1,
                            ch: head.ch
                        };
                        newSelections.push({
                            anchor: newPos,
                            head: newPos
                        });
                    }
                });
                
                cm.setSelections(newSelections);
                return true;
            },

            // Ctrl+Alt+L - добавить курсоры в конец строк выделения
            'Ctrl-Alt-L': function(cm) {
                console.log('Multi-cursor: Ctrl+Alt+L pressed');
                
                const selections = cm.listSelections();
                
                if (selections.length === 0) {
                    // Если нет выделения - просто перемещаем курсор в конец текущей строки
                    const cursor = cm.getCursor();
                    const lineLength = cm.getLine(cursor.line).length;
                    cm.setCursor({line: cursor.line, ch: lineLength});
                    return true;
                }
                
                const newSelections = [];
                
                selections.forEach(selection => {
                    const from = selection.anchor;
                    const to = selection.head;
                    
                    // Определяем границы выделения
                    const startLine = Math.min(from.line, to.line);
                    const endLine = Math.max(from.line, to.line);
                    
                    // Добавляем курсоры в конец каждой строки выделения
                    for (let line = startLine; line <= endLine; line++) {
                        const lineLength = cm.getLine(line).length;
                        newSelections.push({
                            anchor: {line: line, ch: lineLength},
                            head: {line: line, ch: lineLength}
                        });
                    }
                });
                
                cm.setSelections(newSelections);
                return true;
            },

            // Esc - очистить все курсоры кроме первого
            'Esc': function(cm) {
                const selections = cm.listSelections();
                if (selections.length > 1) {
                    cm.setSelections([selections[0]]);
                    return true;
                }
                return false;
            }
        });
    }
};

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  Editor.init();
  setupDropdowns();
});


// Делаем Editor глобально доступным
window.Editor = Editor;