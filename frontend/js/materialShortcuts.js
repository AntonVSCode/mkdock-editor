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
    h6: "###### ",
    
    // Списки
    bullet: "- ",
    numbered: "1.  ",
    checkbox: "- [ ] ",
    checkbox_checked: "- [x] "
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
      this.registerHotkeys();
      this.setupButtons();
      this.setupListHandlers();
      return this;
    },

    // Настройка обработчиков для умных списков
    setupListHandlers: function() {
      if (!this.editor?.cmInstance) return;

      const cm = this.editor.cmInstance;
      
      cm.on('keydown', (cm, event) => {
        if (event.key === 'Enter') {
          this._handleEnterKey(cm);
        }
      });
    },

    // Обработка клавиши Enter для умных списков
    _handleEnterKey: function(cm) {
      const doc = cm.getDoc();
      const cursor = doc.getCursor();
      const line = doc.getLine(cursor.line);
      
      // Проверяем, находимся ли мы в списке
      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s/);
      const checkboxMatch = line.match(/^(\s*)([-*+])\s+\[([ x]?)\]\s/);
      
      if (checkboxMatch) {
        // Обработка чекбоксов
        event.preventDefault();
        const indent = checkboxMatch[1];
        const bullet = checkboxMatch[2];
        const checked = checkboxMatch[3];
        
        if (line.trim() === `${bullet} [${checked}]`) {
          // Если строка содержит только чекбокс без текста - выходим из списка
          doc.replaceRange('', {line: cursor.line, ch: 0}, {line: cursor.line, ch: line.length});
          return;
        }
        
        // Создаем новый пункт чекбокса
        doc.replaceRange('\n' + indent + bullet + ' [ ] ', cursor);
        doc.setCursor({
          line: cursor.line + 1,
          ch: (indent + bullet + ' [ ] ').length
        });
        
      } else if (listMatch) {
        // Обработка обычных списков
        event.preventDefault();
        const indent = listMatch[1];
        const bullet = listMatch[2];
        
        if (line.trim() === bullet) {
          // Если строка содержит только маркер списка без текста - выходим из списка
          doc.replaceRange('', {line: cursor.line, ch: 0}, {line: cursor.line, ch: line.length});
          return;
        }
        
        // Для нумерованных списков увеличиваем номер
        let newBullet = bullet;
        if (/^\d+\.$/.test(bullet)) {
          const number = parseInt(bullet) + 1;
          newBullet = number + '. ';
        }
        
        // Создаем новый пункт списка
        doc.replaceRange('\n' + indent + newBullet + ' ', cursor);
        doc.setCursor({
          line: cursor.line + 1,
          ch: (indent + newBullet + ' ').length
        });
      }
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

        // Функция для определения типа форматирования и соответствующего шаблона
    _getFormattingTemplate: function(wrapChars) {
      const templates = {
        '**': '**текст**',
        '__': '__текст__',
        '*': '*текст*',
        '_': '_текст_',
        '***': '***текст***',
        '___': '___текст___',
        '^^': '^^текст^^',
        '~~': '~~текст~~',
        '==': '==текст==',
        '`': '`код`'
      };
      
      return templates[wrapChars] || wrapChars + wrapChars;
    },

    // Вставка списка
    _insertText: function(text, wrapChars = null) {
      if (!this.editor) return;

      if (this.editor.cmInstance) {
        // Для CodeMirror
        const cm = this.editor.cmInstance;
        const doc = cm.getDoc();
        const selections = doc.listSelections();
        const hasSelection = selections.length > 0 && !selections[0].empty();

        if (wrapChars) {
          // Обработка форматирования текста
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
                        const template = this._getFormattingTemplate(wrapChars);
            doc.replaceRange(template, cursor);
            
            // Выделяем текст внутри форматирования для удобства редактирования
            if (wrapChars === '`') {
              // Для встроенного кода - выделяем только текст между ``
              doc.setSelection(
                { line: cursor.line, ch: cursor.ch + 1 },
                { line: cursor.line, ch: cursor.ch + template.length - 1 }
              );
            } else {
              // Для остальных типов форматирования
              doc.setSelection(
                { line: cursor.line, ch: cursor.ch + wrapChars.length },
                { line: cursor.line, ch: cursor.ch + template.length - wrapChars.length }
              );
            }
          }
          cm.focus();
        } else {
          // Обычная вставка текста без форматирования
          doc.replaceRange(text, doc.getCursor());
        }
      } else if (typeof this.editor.insertAtCursor === 'function') {
        // Для простого textarea
        if (wrapChars) {
          const selectedText = this.editor.getSelectedText();
          if (selectedText) {
            if (this._hasFormatting(selectedText, wrapChars)) {
              this.editor.replaceSelection(this._removeFormatting(selectedText, wrapChars));
            } else {
              this.editor.replaceSelection(wrapChars + selectedText + wrapChars);
            }
          } else {
            const template = this._getFormattingTemplate(wrapChars);
            this.editor.insertAtCursor(template);
            
            // Устанавливаем выделение для редактирования
            const pos = this.editor.selectionStart;
            if (wrapChars === '`') {
              this.editor.setSelectionRange(pos - template.length + 1, pos - 1);
            } else {
              this.editor.setSelectionRange(pos - template.length + wrapChars.length, pos - wrapChars.length);
            }
          }
          this.editor.focus();
        } else {
          this.editor.insertAtCursor(text);
        }
      }
    },

    // Вставка списка
    _insertList: function(listType) {
      if (!this.editor) return;
      
      const template = _templates[listType];
      if (!template) return;

      if (this.editor.cmInstance) {
        // Для CodeMirror
        const cm = this.editor.cmInstance;
        const doc = cm.getDoc();
        const selections = doc.listSelections();
        const hasSelection = selections.length > 0 && !selections[0].empty();

        if (hasSelection) {
          // Если есть выделение - обрабатываем весь выделенный текст
          const selectedTexts = doc.getSelections();
          const newTexts = selectedTexts.map(selectedText => {
            // Проверяем, является ли текст уже списком этого типа
            const lines = selectedText.split('\n');
            
            // Проверяем, все ли строки являются списком нужного типа
            const isAlreadyList = lines.every(line => {
              if (listType === 'bullet') return line.match(/^\s*[-*+]\s/);
              if (listType === 'numbered') return line.match(/^\s*\d+\.\s/);
              if (listType === 'checkbox') return line.match(/^\s*[-*+]\s+\[\s\]\s/);
              if (listType === 'checkbox_checked') return line.match(/^\s*[-*+]\s+\[x\]\s/);
              return false;
            });
            
            if (isAlreadyList) {
              // Если уже список - убираем форматирование
              return lines.map(line => {
                if (listType === 'bullet') return line.replace(/^\s*[-*+]\s/, '');
                if (listType === 'numbered') return line.replace(/^\s*\d+\.\s/, '');
                if (listType === 'checkbox') return line.replace(/^\s*[-*+]\s+\[\s\]\s/, '');
                if (listType === 'checkbox_checked') return line.replace(/^\s*[-*+]\s+\[x\]\s/, '');
                return line;
              }).join('\n');
            } else {
              // Если не список - добавляем форматирование
              return lines.map((line, index) => {
                if (listType === 'bullet') return `- ${line}`;
                if (listType === 'numbered') return `${index + 1}. ${line}`;
                if (listType === 'checkbox') return `- [ ] ${line}`;
                if (listType === 'checkbox_checked') return `- [x] ${line}`;
                return line;
              }).join('\n');
            }
          });
          
          doc.replaceSelections(newTexts);
        } else {
          // Если нет выделения - вставляем шаблон
          const cursor = doc.getCursor();
          doc.replaceRange(template, cursor);
          
          // Устанавливаем курсор после маркера списка
          doc.setCursor({
            line: cursor.line,
            ch: cursor.ch + template.length
          });
        }
        
        cm.focus();
      } else if (typeof this.editor.insertAtCursor === 'function') {
        // Для простого textarea
        const selectedText = this.editor.getSelectedText();
        
        if (selectedText) {
          // Если есть выделение - обрабатываем весь выделенный текст
          const lines = selectedText.split('\n');
          
          // Проверяем, является ли текст уже списком этого типа
          const isAlreadyList = lines.every(line => {
            if (listType === 'bullet') return line.match(/^\s*[-*+]\s/);
            if (listType === 'numbered') return line.match(/^\s*\d+\.\s/);
            if (listType === 'checkbox') return line.match(/^\s*[-*+]\s+\[\s\]\s/);
            if (listType === 'checkbox_checked') return line.match(/^\s*[-*+]\s+\[x\]\s/);
            return false;
          });
          
          let newText;
          if (isAlreadyList) {
            // Если уже список - убираем форматирование
            newText = lines.map(line => {
              if (listType === 'bullet') return line.replace(/^\s*[-*+]\s/, '');
              if (listType === 'numbered') return line.replace(/^\s*\d+\.\s/, '');
              if (listType === 'checkbox') return line.replace(/^\s*[-*+]\s+\[\s\]\s/, '');
              if (listType === 'checkbox_checked') return line.replace(/^\s*[-*+]\s+\[x\]\s/, '');
              return line;
            }).join('\n');
          } else {
            // Если не список - добавляем форматирование
            newText = lines.map((line, index) => {
              if (listType === 'bullet') return `- ${line}`;
              if (listType === 'numbered') return `${index + 1}. ${line}`;
              if (listType === 'checkbox') return `- [ ] ${line}`;
              if (listType === 'checkbox_checked') return `- [x] ${line}`;
              return line;
            }).join('\n');
          }
          
          this.editor.replaceSelection(newText);
        } else {
          // Если нет выделения - вставляем шаблон
          this.editor.insertAtCursor(template);
          const pos = this.editor.selectionStart;
          this.editor.setSelectionRange(pos, pos);
        }
        
        this.editor.focus();
      }
    },

    // Увеличение отступа (сдвиг вправо)
    _indentRight: function() {
      if (!this.editor) return;
      
      if (this.editor.cmInstance) {
        const cm = this.editor.cmInstance;
        const doc = cm.getDoc();
        const selections = doc.listSelections();
        const hasSelection = selections.length > 0 && !selections[0].empty();
        
        if (hasSelection) {
          const selectedTexts = doc.getSelections();
          const newTexts = selectedTexts.map(text => {
            return text.split('\n').map(line => '    ' + line).join('\n');
          });
          doc.replaceSelections(newTexts);
        } else {
          const cursor = doc.getCursor();
          doc.replaceRange('    ', cursor);
          doc.setCursor({
            line: cursor.line,
            ch: cursor.ch + 4
          });
        }
        cm.focus();
      } else if (typeof this.editor.insertAtCursor === 'function') {
        const selectedText = this.editor.getSelectedText();
        if (selectedText) {
          const newText = selectedText.split('\n').map(line => '    ' + line).join('\n');
          this.editor.replaceSelection(newText);
        } else {
          this.editor.insertAtCursor('    ');
        }
        this.editor.focus();
      }
    },

    // Уменьшение отступа (сдвиг влево)
    _indentLeft: function() {
      if (!this.editor) return;
      
      if (this.editor.cmInstance) {
        const cm = this.editor.cmInstance;
        const doc = cm.getDoc();
        const selections = doc.listSelections();
        const hasSelection = selections.length > 0 && !selections[0].empty();
        
        if (hasSelection) {
          const selectedTexts = doc.getSelections();
          const newTexts = selectedTexts.map(text => {
            return text.split('\n').map(line => {
              // Убираем до 4 пробелов в начале строки
              if (line.startsWith('    ')) {
                return line.substring(4);
              } else if (line.startsWith('   ')) {
                return line.substring(3);
              } else if (line.startsWith('  ')) {
                return line.substring(2);
              } else if (line.startsWith(' ')) {
                return line.substring(1);
              }
              return line;
            }).join('\n');
          });
          doc.replaceSelections(newTexts);
        } else {
          const cursor = doc.getCursor();
          const line = doc.getLine(cursor.line);
          const beforeCursor = line.substring(0, cursor.ch);
          
          // Убираем пробелы перед курсором
          if (beforeCursor.endsWith('    ')) {
            doc.replaceRange('', {line: cursor.line, ch: cursor.ch - 4}, cursor);
          } else if (beforeCursor.endsWith('   ')) {
            doc.replaceRange('', {line: cursor.line, ch: cursor.ch - 3}, cursor);
          } else if (beforeCursor.endsWith('  ')) {
            doc.replaceRange('', {line: cursor.line, ch: cursor.ch - 2}, cursor);
          } else if (beforeCursor.endsWith(' ')) {
            doc.replaceRange('', {line: cursor.line, ch: cursor.ch - 1}, cursor);
          }
        }
        cm.focus();
      } else if (typeof this.editor.insertAtCursor === 'function') {
        const selectedText = this.editor.getSelectedText();
        if (selectedText) {
          const newText = selectedText.split('\n').map(line => {
            // Убираем до 4 пробелов в начале строки
            if (line.startsWith('    ')) {
              return line.substring(4);
            } else if (line.startsWith('   ')) {
              return line.substring(3);
            } else if (line.startsWith('  ')) {
              return line.substring(2);
            } else if (line.startsWith(' ')) {
              return line.substring(1);
            }
            return line;
          }).join('\n');
          this.editor.replaceSelection(newText);
        } else {
          const pos = this.editor.selectionStart;
          const text = this.editor.value;
          
          // Убираем пробелы перед курсором
          if (text.substring(pos - 4, pos) === '    ') {
            this.editor.selectionStart = this.editor.selectionEnd = pos - 4;
            this.editor.setSelectionRange(pos - 4, pos - 4);
          } else if (text.substring(pos - 3, pos) === '   ') {
            this.editor.selectionStart = this.editor.selectionEnd = pos - 3;
            this.editor.setSelectionRange(pos - 3, pos - 3);
          } else if (text.substring(pos - 2, pos) === '  ') {
            this.editor.selectionStart = this.editor.selectionEnd = pos - 2;
            this.editor.setSelectionRange(pos - 2, pos - 2);
          } else if (text.substring(pos - 1, pos) === ' ') {
            this.editor.selectionStart = this.editor.selectionEnd = pos - 1;
            this.editor.setSelectionRange(pos - 1, pos - 1);
          }
        }
        this.editor.focus();
      }
    },

    // Настройка обработчиков кнопок
    setupButtons: function() {
        const handleInsertClick = (e) => {
        e.preventDefault();

        const btn = e.target.closest('[data-insert]');
        if (btn) {
          const textToInsert = btn.getAttribute('data-insert');
          const wrapWith = btn.getAttribute('data-wrap');
          const listType = btn.getAttribute('data-list');
          
          if (textToInsert) {
            // Для заголовков
            if (textToInsert.startsWith('#') && this.editor?.cmInstance) {
              this._insertHeading(this.editor.cmInstance, textToInsert);
              return;
            }
            // Для списков
            if (listType) {
              this._insertList(listType);
              return;
            }
            // Для форматирования текста
            if (wrapWith) {
              this._insertText('', wrapWith);
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

      // Обработчики для кнопок отступов - ВЫНЕСЕМ ИХ ОТДЕЛЬНО
      const indentRightBtn = document.getElementById('indent-right');
      if (indentRightBtn) {
          indentRightBtn.onclick = (e) => {
              e.preventDefault();
              this._indentRight();
          };
      }

      const indentLeftBtn = document.getElementById('indent-left');
      if (indentLeftBtn) {
          indentLeftBtn.onclick = (e) => {
              e.preventDefault();
              this._indentLeft();
          };
      }

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
  this.editor.insertMultilineContent(template, true); 
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

      // Горячие клавиши для отступов
      Object.assign(extraKeys, {
        'Tab': (cm) => {
          // Если есть выделение - увеличиваем отступ
          const doc = cm.getDoc();
          const selections = doc.listSelections();
          const hasSelection = selections.length > 0 && !selections[0].empty();
          
          if (hasSelection) {
            this._indentRight();
            return true; // Предотвращаем стандартное поведение
          }
          return false; // Разрешаем стандартное поведение Tab
        },
        'Shift-Tab': (cm) => {
          // Всегда уменьшаем отступ при Shift+Tab
          this._indentLeft();
          return true; // Предотвращаем стандартное поведение
        }
      });
      
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