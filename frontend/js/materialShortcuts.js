/**
 * Модуль для работы с элементами Material for MkDocs
 * Используем IIFE (Immediately Invoked Function Expression)
 * для избежания конфликтов имен
 */
var MaterialShortcuts = (function() {
  // Шаблоны для быстрой вставки
  const _templates = {
    // Admonitions
    note: `!!! note "Заголовок заметки"\n\n    Содержимое заметки здесь\n`,
    warning: `!!! warning "Внимание!"\n\n    Важное предупреждение\n`,
    abstract: `!!! abstract "Аннотация"\n\n    Краткое описание\n`,
    tip: `!!! tip "Совет"\n\n    Полезный совет\n`,
    success: `!!! success "Успех"\n\n    Сообщение об успешном выполнении\n`,
    failure: `!!! failure "Ошибка"\n\n    Сообщение об ошибке\n`,
    danger: `!!! danger "Опасность"\n\n    Важное предупреждение об опасности\n`,
    bug: `!!! bug "Баги"\n\n    Описание известных проблем\n`,
    quote: `!!! quote "Цитата"\n\n    Текст цитаты\n`,
    
    // Сворачиваемые блоки
    foldable: `??? note "Сворачиваемый блок"\n\n    Содержимое блока\n`,
    question: `??? question "Вопрос"\n\n    Текст вопроса\n`,
    example: `??? example "Пример"\n\n    Пример использования\n`,
    info: `??? info "Информация"\n\n    Дополнительная информация\n`,
    
    // Вкладки
    tabs: `=== "Вкладка 1"\n\n    Содержимое 1\n\n=== "Вкладка 2"\n\n    Содержимое 2\n`,
          
    // Заголовки
    h1: "# ",
    h2: "## ",
    h3: "### ",
    h4: "#### ",
    h5: "##### ",
    h6: "###### "
  };

  // Позиционирование курсора после вставки
  function _positionCursor(cmInstance, lines) {
    if (!cmInstance) return;
    
    const doc = cmInstance.getDoc();
    const cursor = doc.getCursor();
    const emptyLine = lines.findIndex(line => line.trim() === '');
    
    if (emptyLine > -1) {
      doc.setCursor({
        line: cursor.line + emptyLine,
        ch: lines[emptyLine].length
      });
    }
  }

    // Специальная функция для вставки заголовков
  function _insertHeading(cmInstance, text) {
    if (!cmInstance) return;
    
    const doc = cmInstance.getDoc();
    const cursor = doc.getCursor();
    const line = doc.getLine(cursor.line);
    
    // Если строка пустая или уже начинается с #, заменяем её
    if (line.trim() === '' || line.trim().startsWith('#')) {
      doc.replaceRange(text, {line: cursor.line, ch: 0}, {line: cursor.line, ch: line.length});
    } else {
      // Иначе вставляем новую строку с заголовком
      doc.replaceRange('\n' + text, {line: cursor.line, ch: line.length});
    }
    
    // Перемещаем курсор после заголовка
    doc.setCursor({line: cursor.line, ch: text.length});
  }

  return {
    editor: null,

    // Инициализация модуля
    init: function(editorInstance) {
      if (!editorInstance) {
        console.error('Не передан экземпляр редактора');
        return this;
      }
      
      this.editor = editorInstance;
      //this.editor.enableSpellcheck(); // Автоматически включаем проверку
      this.registerHotkeys();
      this.setupButtons();
      return this;
    },

    // Базовые горячие клавиши
    getBaseHotkeys: function() {
      return {
        "Ctrl-Space": "autocomplete",
        "Ctrl-Enter": () => this.editor.saveFile(),
        "F5": () => Preview.refresh(this.editor.getContent())
      };
    },

    // Проверка, содержит ли текст форматирование
    _hasFormatting: function(text, wrapChars) {
      return text.startsWith(wrapChars) && text.endsWith(wrapChars);
    },

    // Удаление форматирования
    _removeFormatting: function(text, wrapChars) {
      return text.substring(wrapChars.length, text.length - wrapChars.length);
    },

    // Вставка текста в редактор с переключаемым форматированием
    _insertText: function(text, wrapChars = null) {
      if (!this.editor) return;

      if (this.editor.cmInstance) {
        // Для CodeMirror
        const cm = this.editor.cmInstance;
        const doc = cm.getDoc();
        const selections = doc.listSelections();
        const hasSelection = selections.length > 0 && !selections[0].empty();

        if (wrapChars) {
          if (hasSelection) {
            const selectedTexts = doc.getSelections();
            const newTexts = selectedTexts.map(selectedText => {
              // Проверяем, есть ли уже такое форматирование
              if (this._hasFormatting(selectedText, wrapChars)) {
                // Удаляем форматирование
                return this._removeFormatting(selectedText, wrapChars);
              } else {
                // Добавляем форматирование
                return wrapChars + selectedText + wrapChars;
              }
            });
            doc.replaceSelections(newTexts);
          } else {
            // Вставляем двойные символы форматирования и позиционируем курсор между ними
            const cursor = doc.getCursor();
            doc.replaceRange(wrapChars + wrapChars, cursor);
            // Перемещаем курсор между символами
            doc.setCursor({
              line: cursor.line,
              ch: cursor.ch + wrapChars.length
            });
          }
        } else {
          // Обычная вставка текста
          const cursor = doc.getCursor();
          doc.replaceRange(text, cursor);
        }
      } else if (typeof this.editor.insertAtCursor === 'function') {
        // Для простого textarea
        if (wrapChars) {
          const selectedText = this.editor.getSelectedText();
          if (selectedText) {
            // Проверяем, есть ли уже такое форматирование
            if (this._hasFormatting(selectedText, wrapChars)) {
              // Удаляем форматирование
              this.editor.replaceSelection(this._removeFormatting(selectedText, wrapChars));
            } else {
              // Добавляем форматирование
              this.editor.replaceSelection(wrapChars + selectedText + wrapChars);
            }
          } else {
            // Вставляем двойные символы форматирования и позиционируем курсор между ними
            this.editor.insertAtCursor(wrapChars + wrapChars);
            // Для textarea нужно вручную установить позицию курсора
            const pos = this.editor.getCursorPosition();
            this.editor.setCursorPosition(pos - wrapChars.length);
          }
        } else {
          this.editor.insertAtCursor(text);
        }
      }
    },

    // Настройка обработчиков кнопок
    setupButtons: function() {
      // Удаляем старые обработчики
      document.querySelectorAll('.markdown-toolbar button[data-insert]').forEach(btn => {
        btn.onclick = null;
      });
      // Обработчик для кнопок с data-insert
      const handleInsertClick = (e) => {
        e.preventDefault();
        const btn = e.target.closest('[data-insert]');
        if (btn) {
          const textToInsert = btn.getAttribute('data-insert');
          const wrapWith = btn.getAttribute('data-wrap');
          if (textToInsert) {
            // Специальная обработка для заголовков
            if (textToInsert.startsWith('#') && this.editor?.cmInstance) {
              _insertHeading(this.editor.cmInstance, textToInsert);
            } 
            // Обработка кнопок форматирования (bold, italic и т.д.)
            else if (wrapWith) {
              this._insertText(textToInsert, wrapWith);
            }
            else {
              this._insertText(textToInsert);
            }
          }
        }
      };

      // Назначаем обработчик на все кнопки с data-insert
      document.querySelectorAll('.markdown-toolbar button[data-insert]').forEach(btn => {
        btn.onclick = handleInsertClick;
      });

      // Обработчик для кнопки сохранения
      const saveBtn = document.getElementById('save-btn');
      if (saveBtn) {
        saveBtn.onclick = async (e) => {
          e.preventDefault();
          try {
            await this.editor.saveFile();
            showNotification('Файл успешно сохранён', 'success', 'mdi mdi-content-save');
          } catch (error) {
            showNotification('Ошибка при сохранении файла', 'error', 'mdi mdi-alert-circle');
          }
        };
      }

      // Кнопки верхнего тулбара (вставка шаблонов)
      const templateButtons = {
        // Admonitions
        'note-btn': 'note',
        'warning-btn': 'warning',
        'abstract-btn': 'abstract',
        'tip-btn': 'tip',
        'success-btn': 'success',
        'failure-btn': 'failure',
        'danger-btn': 'danger',
        'bug-btn': 'bug',
        'quote-btn': 'quote',
        
        // Foldable blocks
        'foldable-btn': 'foldable',
        'question-btn': 'question',
        'example-btn': 'example',
        'info-btn': 'info',
        
        // Tabs
        'tabs-btn': 'tabs',

        // Headings
        'h1-btn': 'h1',
        'h2-btn': 'h2',
        'h3-btn': 'h3',
        'h4-btn': 'h4',
        'h5-btn': 'h5',
        'h6-btn': 'h6'
      };

      // Обработчики для шаблонов (admonitions, code blocks и т.д.)
      Object.entries(templateButtons).forEach(([id, template]) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.onclick = (e) => {
            e.preventDefault();
            // Специальная обработка для заголовков
            if (template.startsWith('h') && this.editor?.cmInstance) {
              _insertHeading(this.editor.cmInstance, _templates[template]);
            } else {
              this.insertTemplate(template);
            }
          };
        }
      });
    },

    // Вставка шаблона
    insertTemplate: function(templateType) {
      if (!this.editor) {
        console.warn('Editor not initialized');
        return;
      }
      
      const template = _templates[templateType];
      if (!template) {
        console.warn(`Unknown template type: ${templateType}`);
        return;
      }
      
      const lines = template.split('\n');
      this._insertText(template);
      
      // Позиционирование курсора для CodeMirror
      if (this.editor.cmInstance) {
        _positionCursor(this.editor.cmInstance, lines);
      }
    },

    // Регистрация горячих клавиш
    registerHotkeys: function() {
      if (!this.editor?.cmInstance) return;

      const cm = this.editor.cmInstance;
      const extraKeys = cm.getOption('extraKeys') || {};
      
      // Базовые горячие клавиши
      Object.assign(extraKeys, this.getBaseHotkeys());
      
      // Горячие клавиши для быстрой вставки элементов
      Object.assign(extraKeys, {
        'Ctrl-Alt-N': () => this.insertTemplate('note'),
        'Ctrl-Alt-W': () => this.insertTemplate('warning'),
        'Ctrl-Alt-A': () => this.insertTemplate('abstract'),
        'Ctrl-Alt-T': () => this.insertTemplate('tabs'),
        'Ctrl-Alt-F': () => this.insertTemplate('foldable'),
        'Ctrl-Alt-C': () => this.insertTemplate('code'),
        'Ctrl-Alt-1': () => _insertHeading(cm, _templates.h1),
        'Ctrl-Alt-2': () => _insertHeading(cm, _templates.h2),
        'Ctrl-Alt-3': () => _insertHeading(cm, _templates.h3),
        'Ctrl-Alt-4': () => _insertHeading(cm, _templates.h4),
        'Ctrl-Alt-5': () => _insertHeading(cm, _templates.h5),
        'Ctrl-Alt-6': () => _insertHeading(cm, _templates.h6)
      });
      
      cm.setOption('extraKeys', extraKeys);
    }
  };
})();