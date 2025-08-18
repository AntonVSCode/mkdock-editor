/**
 * Модуль для работы с элементами Material for MkDocs
 * Используем IIFE (Immediately Invoked Function Expression)
 * для избежания конфликтов имен
 */
var MaterialShortcuts = (function() {
  // Шаблоны для быстрой вставки
  const _templates = {
    // Admonitions
    note: `!!! note\n    Содержимое заметки здесь`,
    warning: `!!! warning\n    Важное предупреждение`,
    abstract: `!!! abstract\n    Краткое описание`,
    tip: `!!! tip\n    Полезный совет`,
    success: `!!! success\n    Сообщение об успешном выполнении`,
    failure: `!!! failure\n    Сообщение об ошибке`,
    danger: `!!! danger\n    Важное предупреждение об опасности`,
    bug: `!!! bug\n    Описание известных проблем`,
    quote: `!!! quote\n    Текст цитаты`,
    
    // Сворачиваемые блоки
    foldable: `??? note "Сворачиваемый блок"\n    Содержимое блока`,
    question: `??? question "Вопрос"\n    Текст вопроса`,
    example: `??? example "Пример"\n    Пример использования`,
    info: `??? info "Информация"\n    Дополнительная информация`,
    
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
    
    // 1. Сначала ищем пустую строку внутри блока (для admonitions и других многострочных блоков)
    const emptyLine = lines.findIndex(line => line.trim() === '');
    
    // 2. Если пустой строки нет, ищем строку с отступом (4 пробела)
    const contentLine = emptyLine === -1 
      ? lines.findIndex(line => line.startsWith('    ')) 
      : emptyLine;
    
    // 3. Если нашли подходящую строку - позиционируем курсор
    if (contentLine > -1) {
      let targetLine = cursor.line + contentLine;
      let targetChar = lines[contentLine].length;
      
      // Для строк с отступом устанавливаем курсор после 4 пробелов
      if (lines[contentLine].startsWith('    ')) {
        targetChar = 4;
      }
      
      doc.setCursor({
        line: targetLine,
        ch: targetChar
      });
    }
    
    // Всегда фокусируем редактор
    cmInstance.focus();
  }

  return {
    editor: null,

  // Добавляем публичный метод для заголовков
  _insertHeading: function(cmInstance, headingChars) {
    if (!cmInstance) {
      console.error('CodeMirror instance not available');
      return;
    }

    const doc = cmInstance.getDoc();
    const cursor = doc.getCursor();
    const line = cursor.line;
    const lineText = doc.getLine(line);
    
    // Получаем текущий текст строки без возможного существующего заголовка
    const textWithoutHeading = lineText.replace(/^#+\s*/, '').trim();
    
    // Определяем позиции для замены
    const from = {line: line, ch: 0};
    const to = {line: line, ch: lineText.length};
    
    // Вставляем новый заголовок
    doc.replaceRange(
      headingChars.trim() + (textWithoutHeading ? ' ' + textWithoutHeading : ''),
      from,
      to
    );

    // Устанавливаем курсор в конец строки
    const newLineText = doc.getLine(line);
    doc.setCursor({line: line, ch: newLineText.length});
    cmInstance.focus();
  },

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

    _insertText: function(text, wrapChars = null) {
      if (!this.editor) return;

      if (this.editor.cmInstance) {
        // Для CodeMirror
        const cm = this.editor.cmInstance;
        const doc = cm.getDoc();
        const selections = doc.listSelections();
        const hasSelection = selections.length > 0 && !selections[0].empty();

        if (wrapChars === '**') {
          // Специальная обработка для жирного текста
          if (hasSelection) {
            const selectedTexts = doc.getSelections();
            const newTexts = selectedTexts.map(selectedText => {
              if (this._hasFormatting(selectedText, wrapChars)) {
                return this._removeFormatting(selectedText, wrapChars);
              } else {
                return wrapChars + selectedText + wrapChars;
              }
            });
            doc.replaceSelections(newTexts);
          } else {
            const cursor = doc.getCursor();
            doc.replaceRange('**Bold text**', cursor);
            doc.setSelection(
              { line: cursor.line, ch: cursor.ch + 2 },
              { line: cursor.line, ch: cursor.ch + 11 }
            );
          }
          cm.focus();
        } else if (wrapChars) {
          // Обработка других видов форматирования (курсив, код и т.д.)
          if (hasSelection) {
            const selectedTexts = doc.getSelections();
            const newTexts = selectedTexts.map(selectedText => {
              if (this._hasFormatting(selectedText, wrapChars)) {
                return this._removeFormatting(selectedText, wrapChars);
              } else {
                return wrapChars + selectedText + wrapChars;
              }
            });
            doc.replaceSelections(newTexts);
          } else {
            const cursor = doc.getCursor();
            doc.replaceRange(wrapChars + wrapChars, cursor);
            doc.setCursor({
              line: cursor.line,
              ch: cursor.ch + wrapChars.length
            });
          }
          cm.focus();
        } else {
          // Обычная вставка текста без форматирования
          doc.replaceRange(text, doc.getCursor());
        }
      } else if (typeof this.editor.insertAtCursor === 'function') {
        // Для простого textarea
        if (wrapChars === '**') {
          const selectedText = this.editor.getSelectedText();
          if (selectedText) {
            if (this._hasFormatting(selectedText, wrapChars)) {
              this.editor.replaceSelection(this._removeFormatting(selectedText, wrapChars));
            } else {
              this.editor.replaceSelection(wrapChars + selectedText + wrapChars);
            }
          } else {
            this.editor.insertAtCursor('**текст**');
            const pos = this.editor.selectionStart;
            this.editor.setSelectionRange(pos - 11, pos - 2);
          }
          this.editor.focus();
        } else if (wrapChars) {
          const selectedText = this.editor.getSelectedText();
          if (selectedText) {
            if (this._hasFormatting(selectedText, wrapChars)) {
              this.editor.replaceSelection(this._removeFormatting(selectedText, wrapChars));
            } else {
              this.editor.replaceSelection(wrapChars + selectedText + wrapChars);
            }
          } else {
            this.editor.insertAtCursor(wrapChars + wrapChars);
            const pos = this.editor.selectionStart;
            this.editor.setSelectionRange(pos - wrapChars.length, pos - wrapChars.length);
          }
          this.editor.focus();
        } else {
          this.editor.insertAtCursor(text);
        }
      }
    },

    // Настройка обработчиков кнопок
    setupButtons: function() {
      // Удаляем старые обработчики
        console.log('[DEBUG] Setting up buttons, current mode:', 
    this.editor?.cmInstance?.getOption('mode'));
      document.querySelectorAll('.markdown-toolbar button[data-insert]').forEach(btn => {
        btn.onclick = null;
      });

    const handleInsertClick = (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-insert]');
    if (btn) {
      const textToInsert = btn.getAttribute('data-insert');
      const wrapWith = btn.getAttribute('data-wrap');
      
      if (textToInsert) {
        // Для заголовков
        if (textToInsert.startsWith('#') && this.editor?.cmInstance) {
          this._insertHeading(this.editor.cmInstance, textToInsert);
          return;
        }
        // Для жирного текста - передаем только ** без текста
        if (wrapWith === '**') {
          this._insertText('', wrapWith); // Пустая строка вместо "Bold text"
        } 
        // Для остального форматирования
        else if (wrapWith) {
          this._insertText(textToInsert, wrapWith);
        } else {
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
              this._insertHeading(this.editor.cmInstance, _templates[template]);
            } else {
              // Обычная вставка для admonitions и других блоков
              this.insertTemplate(template);
            }
          };
        }
      });
    },

insertTemplate: function(templateType) {
  if (!this.editor) return;
  
  const template = _templates[templateType];
  if (!template) return;

  console.group('[MaterialShortcuts] Inserting template:', templateType);
  this.editor.insertMultilineContent(template, true); // true = позиционировать курсор после 4 пробелов
  console.groupEnd();
},

    // Новая функция для позиционирования курсора
    _positionCursorAfterInsert: function(doc, originalCursor, lines) {
      // Находим первую строку с контентом (4 пробела)
      const contentLineIndex = lines.findIndex(line => line.startsWith('    '));
      
      if (contentLineIndex !== -1) {
        doc.setCursor({
          line: originalCursor.line + contentLineIndex,
          ch: 4 // После 4 пробелов
        });
      } else {
        // Иначе ставим в конец вставленного текста
        doc.setCursor({
          line: originalCursor.line + lines.length - 1,
          ch: lines[lines.length - 1].length
        });
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
        'Ctrl-Alt-1': () => this._insertHeading(cm, _templates.h1),
        'Ctrl-Alt-2': () => this._insertHeading(cm, _templates.h2),
        'Ctrl-Alt-3': () => this._insertHeading(cm, _templates.h3),
        'Ctrl-Alt-4': () => this._insertHeading(cm, _templates.h4),
        'Ctrl-Alt-5': () => this._insertHeading(cm, _templates.h5),
        'Ctrl-Alt-6': () => this._insertHeading(cm, _templates.h6)
      });
      
      cm.setOption('extraKeys', extraKeys);
    }
  };
})();