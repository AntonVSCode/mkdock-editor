/**
 * Модуль для работы с блоками кода и модальным окном
 */
const CodeBlockModal = {
  // Избранные языки
  favoriteLanguages: JSON.parse(localStorage.getItem('codeBlockFavoriteLanguages') || '[]'),
  
  // Все доступные языки (с русскими названиями)
  allLanguages: [
    { id: 'bash', name: 'Bash' },
    { id: 'c', name: 'C' },
    { id: 'csharp', name: 'C#' },
    { id: 'cpp', name: 'C++' },
    { id: 'css', name: 'CSS' },
    { id: 'dart', name: 'Dart' },
    { id: 'diff', name: 'Diff' },
    { id: 'fsharp', name: 'F#' },
    { id: 'go', name: 'Go' },
    { id: 'html', name: 'HTML' },
    { id: 'java', name: 'Java' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'json', name: 'JSON' },
    { id: 'kotlin', name: 'Kotlin' },
    { id: 'markdown', name: 'Markdown' },
    { id: 'php', name: 'PHP' },
    { id: 'powershell', name: 'PowerShell' },
    { id: 'python', name: 'Python' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'rust', name: 'Rust' },
    { id: 'sql', name: 'SQL' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'xml', name: 'XML' },
    { id: 'yaml', name: 'YAML' }
  ],

  // Инициализация модуля
  init: function() {
    this.setupModal();
    this.setupCodeButton();
    this.setupTheme();
    this.checkDocumentAnnotations();
  },

  // Настройка кнопки для открытия модального окна
  setupCodeButton: function() {
      const codeBtn = document.getElementById('code-btn');
      if (codeBtn) {
          codeBtn.onclick = (e) => {
              e.preventDefault();
              
              // Получаем текущий блок кода (может вернуть null)
              const currentCodeBlock = this.getCurrentCodeBlock();
              
              // Если курсор на пустой строке или вне блока кода - открываем пустое окно
              if (!currentCodeBlock) {
                  this.openModal();
              } else {
                  this.openModalWithCode(currentCodeBlock);
              }
          };
      }
  },

  // Настройка темы
  setupTheme: function() {
      const theme = localStorage.getItem('editorTheme') || 'default';
      
      // Применяем текущую тему к редактору, если он существует
      if (this.codeEditor) {
          this.codeEditor.setOption('theme', theme);
      }
      
      // Слушаем изменения темы
      window.addEventListener('storage', (e) => {
          if (e.key === 'editorTheme' && this.codeEditor) {
              this.codeEditor.setOption('theme', e.newValue);
          }
      });
  },

  // Создание и настройка модального окна
  setupModal: function() {
    // Удаляем старое модальное окно, если есть
    const oldModal = document.getElementById('code-block-modal');
    if (oldModal && document.body.contains(oldModal)) {
        document.body.removeChild(oldModal);
    }

    // Проверяем, не существует ли уже модальное окно
    if (document.getElementById('code-block-modal')) {
        return;
    }
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'code-block-modal';
    modal.className = 'modal';
    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Настройки блока кода</h3>
        <div class="annotations-indicator"></div>
        <button class="close-modal">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="settings-columns">
          <!-- Левая колонка - языки -->
          <div class="language-column">
            <div class="language-selection">
              <input type="text" class="language-search" placeholder="Поиск языка...">
              <div class="languages-container"></div>
            </div>
          </div>
          
          <!-- Правая колонка - настройки -->
          <div class="settings-column-wrapper">
            <div class="settings-column">
              <!-- Группа заголовка и номеров строк -->
              <div class="title-line-group">
                <div class="form-group title-input">
                  <label for="code-title">Заголовок блока</label>
                  <input type="text" id="code-title" placeholder="Введите понятный заголовок">
                </div>
                <div class="form-group line-numbers-input">
                  <label for="line-numbers">Номера строк</label>
                  <input type="text" id="line-numbers" value="1" class="small-input">
                </div>
              </div>
              
              <!-- Редактор кода -->
              <div class="code-editor-container">
                <textarea id="code-content" class="code-editor"></textarea>
              </div>
              
              <!-- Дополнительные параметры -->
              <div class="advanced-options">
                <div class="advanced-toggle collapsed">
                  <i class="mdi mdi-chevron-right"></i>
                  <span>Дополнительные параметры</span>
                </div>
                
                <div class="advanced-content">
                  <div class="form-group">
                    <label for="highlight-lines">Подсветка строк</label>
                    <input type="text" id="highlight-lines" placeholder="Например: 1 3-5 7">
                    <small class="hint">Укажите номера строк или диапазоны</small>
                  </div>
                  
                  <div class="form-group">
                    <label for="code-annotations-text">Текст аннотаций</label>
                    <textarea id="code-annotations-text" placeholder="Введите аннотации (будут добавлены в конец блока)"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn secondary cancel-btn">Отмена</button>
        <button class="btn primary insert-btn">Вставить код</button>
      </div>
    </div>
    `;
    
    document.body.appendChild(modal);
    
    // Инициализация CodeMirror
    const editorTextarea = modal.querySelector('#code-content');
    if (window.CodeMirror) {
      this.codeEditor = CodeMirror.fromTextArea(editorTextarea, {
        mode: 'text/x-csrc',
        lineNumbers: true,
        indentUnit: 4,
        theme: 'default',
        lineWrapping: true,
        autofocus: true,
        viewportMargin: Infinity,
        extraKeys: {
          "Ctrl-Space": "autocomplete"
        },
        autoCloseBrackets: true,
        matchBrackets: true,
        autoCloseTags: true,
        highlightSelectionMatches: true
      });
      
      // Увеличиваем высоту редактора
      this.codeEditor.setSize(null, '400px');

              
      // Применяем тему из localStorage
      const theme = localStorage.getItem('editorTheme') || 'default';
      this.codeEditor.setOption('theme', theme);
    }
 
    // Обработчики событий
    modal.querySelector('.close-modal').onclick = () => this.closeModal();
    modal.querySelector('.cancel-btn').onclick = () => this.closeModal();
    modal.querySelector('.insert-btn').onclick = () => this.insertCodeBlock();

    // Обработчик для автоматического фокуса при открытии
    modal.addEventListener('shown', () => {
        this.codeEditor.focus();
    });
       
    // Обработчик поиска
    const searchInput = modal.querySelector('.language-search');
    searchInput.oninput = (e) => this.filterLanguages(e.target.value);

    // Обработчик дополнительных параметров
    const advancedToggle = modal.querySelector('.advanced-toggle');
    advancedToggle.onclick = () => {
      advancedToggle.classList.toggle('collapsed');
      modal.querySelector('.advanced-content').classList.toggle('expanded');
    };

    // Валидация поля подсветки строк
    const highlightLinesInput = modal.querySelector('#highlight-lines');
    highlightLinesInput.addEventListener('input', function(e) {
        // Сохраняем позицию курсора
        const cursorPos = this.selectionStart;
        const originalValue = this.value;
        
        // 1. Сначала разрешаем только цифры, пробелы и дефисы
        let newValue = originalValue.replace(/[^\d\s-]/g, '');
        
        // 2. Удаляем лишние дефисы (больше одного подряд)
        newValue = newValue.replace(/-{2,}/g, '-');
        
        // 3. Удаляем пробелы вокруг дефисов (но разрешаем пробелы между группами)
        newValue = newValue.replace(/(\d)\s*-\s*(\d)/g, '$1-$2');
              
        // Если значение изменилось - обновляем и показываем уведомление
        if (newValue !== originalValue) {
            this.value = newValue;
            
            // Восстанавливаем позицию курсора с учетом изменений
            const diff = originalValue.length - newValue.length;
            this.setSelectionRange(cursorPos - diff, cursorPos - diff);
            
            // Показываем уведомление только если было удаление символов
            if (newValue.length < originalValue.length) {
                showNotification('Разрешены только цифры, пробелы и один дефис между числами', 'warning', 2000);
            }
        }
    });

    // Добавляем валидацию при потере фокуса
    highlightLinesInput.addEventListener('blur', function() {
        if (this.value.includes(' - ')) {
            this.value = this.value.replace(/\s*-\s*/g, '-');
            showNotification('Дефисы автоматически исправлены (удалены пробелы вокруг)', 'info', 2000);
        }
    });
    
    // Инициализация списка языков
    this.updateLanguagesList();
  },

  // Обновление списка языков
  updateLanguagesList: function(filter = '') {
    const container = document.querySelector('.languages-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filteredLangs = this.allLanguages.filter(lang => 
      lang.name.toLowerCase().includes(filter.toLowerCase()) || 
      lang.id.toLowerCase().includes(filter.toLowerCase())
          ).sort((a, b) => {
      // Сначала избранные, затем по алфавиту
      const aIsFavorite = this.favoriteLanguages.includes(a.id);
      const bIsFavorite = this.favoriteLanguages.includes(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
    
    filteredLangs.forEach(lang => {
      const langEl = document.createElement('div');
      langEl.className = 'language-item';
      if (this.favoriteLanguages.includes(lang.id)) {
        langEl.classList.add('favorite');
      }
      langEl.dataset.lang = lang.id;
      langEl.innerHTML = `
        <span>${lang.name}</span>
        <button class="toggle-favorite" title="${this.favoriteLanguages.includes(lang.id) ? 'Удалить из избранных' : 'Добавить в избранные'}">
          <i class="mdi ${this.favoriteLanguages.includes(lang.id) ? 'mdi-star' : 'mdi-star-outline'}"></i>
        </button>
      `;
      
      langEl.onclick = (e) => {
        if (!e.target.closest('.toggle-favorite')) {
          this.selectLanguage(lang.id);
        }
      };
      
      langEl.querySelector('.toggle-favorite').onclick = (e) => {
        e.stopPropagation();
        this.toggleFavorite(lang.id);
      };
      
      container.appendChild(langEl);
    });
  },

  // Получение текущего блока кода, в котором находится курсор
  getCurrentCodeBlock: function() {
      if (!Editor.cmInstance) return null;
      
      const doc = Editor.cmInstance.getDoc();
      const cursor = doc.getCursor();
      const lineText = doc.getLine(cursor.line);
      
      // Если курсор на пустой строке или не внутри блока кода - возвращаем null
      if (lineText.trim() === '' || !this.isInsideCodeBlock(doc, cursor.line)) {
          return null;
      }
      
      // Остальной код метода остается без изменений
      let startLine = cursor.line;
      while (startLine >= 0 && !doc.getLine(startLine).startsWith('```')) {
          startLine--;
      }
      
      if (startLine < 0) return null;
      
      let endLine = cursor.line;
      const lineCount = doc.lineCount();
      while (endLine < lineCount && !doc.getLine(endLine).startsWith('```')) {
          endLine++;
      }
      
      if (endLine >= lineCount || startLine === endLine) return null;
      
      const header = doc.getLine(startLine).substring(3).trim();
      
            // Новый парсинг заголовка блока кода
      let lang = 'text';
      let paramsString = '';
      
      if (header.startsWith('{')) {
          // Формат с фигурными скобками: ```{ .lang param1="value1" param2="value2" }
          const closingBraceIndex = header.indexOf('}');
          if (closingBraceIndex > 0) {
              const insideBraces = header.substring(1, closingBraceIndex).trim();
              const parts = insideBraces.split(/\s+/);
              
              // Первая часть после { - это язык (начинается с точки)
              if (parts.length > 0 && parts[0].startsWith('.')) {
                  lang = parts[0].substring(1);
                  paramsString = parts.slice(1).join(' ');
              } else {
                  paramsString = insideBraces;
              }
          }
      } else {
          // Старый формат: ```lang param1 param2
          const firstSpace = header.indexOf(' ');
          if (firstSpace > 0) {
              lang = header.substring(0, firstSpace);
              paramsString = header.substring(firstSpace + 1);
          } else {
              lang = header;
          }
      }
      
      let content = '';
      for (let i = startLine + 1; i < endLine; i++) {
          content += doc.getLine(i) + '\n';
      }
      
      let annotations = '';
      let annotationEndLine = endLine;
      let nextLine = endLine + 1;
      
      while (nextLine < lineCount && doc.getLine(nextLine).startsWith('    ')) {
          annotations += doc.getLine(nextLine).substring(4) + '\n';
          annotationEndLine = nextLine;
          nextLine++;
      }
      
      return {
          lang: lang || 'text',
          params: paramsString,
          content: content.trim(),
          annotations: annotations.trim(),
          startLine: startLine,
          endLine: endLine,
          annotationEndLine: annotations ? annotationEndLine : endLine
      };
  },

  // Новый вспомогательный метод для проверки, находится ли курсор внутри блока кода
  isInsideCodeBlock: function(doc, lineNumber) {
      let startLine = lineNumber;
      let endLine = lineNumber;
      const lineCount = doc.lineCount();
      
      // Ищем начало блока кода выше текущей строки
      while (startLine >= 0 && !doc.getLine(startLine).startsWith('```')) {
          startLine--;
      }
      
      // Если не нашли начало блока - возвращаем false
      if (startLine < 0) return false;
      
      // Ищем конец блока кода ниже текущей строки
      while (endLine < lineCount && !doc.getLine(endLine).startsWith('```')) {
          endLine++;
      }
      
      // Если не нашли конец блока или это тот же блок - возвращаем false
      if (endLine >= lineCount || startLine === endLine) return false;
      
      // Проверяем, что текущая строка между началом и концом блока
      return lineNumber > startLine && lineNumber < endLine;
  },

  // Открытие модального окна с существующим кодом
  openModalWithCode: function(codeBlock) {
      const modal = document.getElementById('code-block-modal');
      if (!modal) return;
      
      // Всегда сбрасываем состояние при открытии
      modal.dataset.editingBlock = '';
      delete modal.dataset.selectedLang;
      
      // Если нет блока кода - открываем пустое окно
      if (!codeBlock) {
          this.openModal();
          return;
      }

      // Устанавливаем выбранный язык
      const lang = this.allLanguages.find(l => l.id === codeBlock.lang) || 
                  this.allLanguages.find(l => l.id === 'text');
      if (lang) {
          modal.dataset.selectedLang = lang.id;

          // Добавляем стиль для выделенного языка
          const style = document.createElement('style');
          style.id = 'selected-language-style';
          style.textContent = `
              .language-item.selected {
                  font-weight: bold;
                  color: #2563eb;
                  background-color: rgba(37, 99, 235, 0.1);
              }
          `;
          document.head.appendChild(style);
      }

      // Заполняем редактор кодом
      if (this.codeEditor) {
          this.codeEditor.setValue(codeBlock.content || '');
          if (lang) {
              const mode = this.findMode(lang.id);
              this.codeEditor.setOption('mode', mode.mode);
          }
          
          // Фокусируем редактор
          setTimeout(() => {
              this.codeEditor.focus();
              this.codeEditor.setCursor(0);
          }, 0);
      }

      // Парсим параметры блока
      const params = this.parseCodeBlockParams(codeBlock.params);
      
      // Заполняем поля формы
      modal.querySelector('#code-title').value = params.title || '';
      modal.querySelector('#highlight-lines').value = params.hl_lines || '';
      modal.querySelector('#line-numbers').value = params.linenums || '1';
      
      // Обработка аннотаций
      const annotationsTextarea = modal.querySelector('#code-annotations-text');
      annotationsTextarea.value = codeBlock.annotations || '';
      
      // Добавляем индикатор аннотаций
      const annotationsIndicator = modal.querySelector('.modal-header .annotations-indicator');
      annotationsIndicator.textContent = codeBlock.annotations ? 'Аннотации: есть' : 'Аннотации: нет';
      annotationsIndicator.style.display = 'block';
        
      // Сохраняем информацию о редактируемом блоке
      if (codeBlock.startLine !== undefined) {
          modal.dataset.editingBlock = JSON.stringify({
              startLine: codeBlock.startLine,
              endLine: codeBlock.endLine,
              annotationEndLine: codeBlock.annotationEndLine || codeBlock.endLine
          });
      }

      // Обновляем список языков и выделяем выбранный
      this.updateLanguagesList();
      setTimeout(() => {
          const selectedLang = modal.querySelector(`.language-item[data-lang="${lang.id}"]`);
          if (selectedLang) {
              selectedLang.classList.add('selected');
          }
      }, 50);

      // Открываем модальное окно
      modal.style.display = 'flex';
      modal.classList.add('active');
      document.body.classList.add('modal-open');
  },

  findMode: function(id) {
      const modeMap = {
          'bash': 'shell',
          'c': 'text/x-csrc',
          'cpp': 'text/x-c++src',
          'csharp': 'text/x-csharp',
          'css': 'css',
          'dart': 'dart',
          'diff': 'diff',
          'fsharp': 'mllike',
          'go': 'go',
          'html': 'htmlmixed',
          'java': 'text/x-java',
          'javascript': 'javascript',
          'json': 'application/json',
          'kotlin': 'text/x-kotlin',
          'markdown': 'markdown',
          'php': 'php',
          'powershell': 'powershell',
          'python': 'python',
          'ruby': 'ruby',
          'rust': 'rust',
          'sql': 'sql',
          'typescript': 'text/typescript',
          'xml': 'xml',
          'yaml': 'yaml'
      };
      
      return { mode: modeMap[id] || 'text/plain' };
  },

  // Парсинг параметров блока кода
  parseCodeBlockParams: function(paramsString) {
      const params = {};
      // Регулярное выражение для поиска параметров вида key или key="value"
      const regex = /(\w+)(?:="([^"]*)")?/g;
      let match;
      
      while ((match = regex.exec(paramsString)) !== null) {
          const key = match[1];
          const value = match[2] !== undefined ? match[2] : true; // Если значение не указано, устанавливаем true
          
          // Специальная обработка для hl_lines
          if (key === 'hl_lines') {
              // Если есть значение (в кавычках), сохраняем его
              if (match[2] !== undefined) {
                  params.hl_lines = match[2];
              } else {
                  // Если параметр просто hl_lines без значения
                  params.hl_lines = true;
              }
          } else {
              params[key] = value;
          }
      }
      
      return params;
  },

  // Фильтрация языков
  filterLanguages: function(searchText) {
    this.updateLanguagesList(searchText);
  },

  // Добавление/удаление языка из избранного
  toggleFavorite: function(langId) {
    const index = this.favoriteLanguages.indexOf(langId);
    if (index === -1) {
      this.favoriteLanguages.push(langId);
    } else {
      this.favoriteLanguages.splice(index, 1);
    }
    
    localStorage.setItem('codeBlockFavoriteLanguages', JSON.stringify(this.favoriteLanguages));
    this.updateLanguagesList(document.querySelector('.language-search')?.value || '');
  },

  // Выбор языка
  selectLanguage: function(langId) {
    const modal = document.getElementById('code-block-modal');
    modal.dataset.selectedLang = langId;
    
    // Добавляем визуальное выделение
    modal.querySelectorAll('.language-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.lang === langId);
    });

    // Обновляем редактор кода
    if (this.codeEditor) {
      const lang = this.allLanguages.find(l => l.id === langId);
      if (lang) {
        this.codeEditor.setOption('mode', `text/x-${lang.id}`);
      }
    }
  },

  // Открытие модального окна
  openModal: function() {
      const modal = document.getElementById('code-block-modal');
      if (!modal) {
          this.setupModal();
          return;
      }
      
      // Полный сброс состояния
      modal.dataset.editingBlock = '';
      delete modal.dataset.selectedLang;
      
      // Сброс редактора кода
      if (this.codeEditor) {
          this.codeEditor.setValue('');
          this.codeEditor.setOption('mode', 'text/x-csrc');
          
          // Фокусируем редактор
          setTimeout(() => {
              this.codeEditor.focus();
              this.codeEditor.setCursor(0);
          }, 0);
      }

      // Сброс полей формы (удалены обращения к несуществующим чекбоксам)
      modal.querySelector('#code-title').value = '';
      modal.querySelector('#code-annotations-text').value = '';
      modal.querySelector('#line-numbers').value = '1'; // Изменено с checked на value
      modal.querySelector('#highlight-lines').value = '';
      modal.querySelector('.advanced-toggle').classList.add('collapsed');
      modal.querySelector('.advanced-content').classList.remove('expanded');
      
      // Обновляем список языков
      this.updateLanguagesList();

      // Открываем модальное окно
      modal.style.display = 'flex';
      modal.classList.add('active');
      document.body.classList.add('modal-open');
  },

  // Закрытие модального окна
  closeModal: function() {
    const modal = document.getElementById('code-block-modal');
    modal.style.display = 'none';
    modal.classList.remove('active'); // Добавьте это
    document.body.classList.remove('modal-open');
  },

  // Vетод для проверки аннотаций во всем документе
  checkDocumentAnnotations: function() {
      if (!Editor.cmInstance) return;
      
      const fullDoc = Editor.cmInstance.getDoc().getValue();
      const hasAnnotations = /(?:^|\n) {4}.+?(?=\n|$)/.test(fullDoc);
      
      const modal = document.getElementById('code-block-modal');
      if (modal) {
          const indicator = modal.querySelector('.modal-header .annotations-indicator');
          if (indicator) {
              indicator.textContent = hasAnnotations ? 'Аннотации: есть в документе' : 'Аннотации: нет';
              indicator.style.display = 'block';
          }
      }
  },

  // Вставка блока кода в редактор
  insertCodeBlock: function() {
      const modal = document.getElementById('code-block-modal');
      const langId = modal.dataset.selectedLang;
      
      // Проверяем выбран ли язык
      if (!langId) {
          showNotification('Выберите язык программирования', 'error');
          return;
      }
      
      // Находим выбранный язык в списке
      const lang = this.allLanguages.find(l => l.id === langId);
      if (!lang) return;
      
      // Получаем содержимое редактора
      let codeContent = this.codeEditor ? this.codeEditor.getValue() : '';
      
      // Экранируем HTML-теги в коде
      codeContent = codeContent
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      
      // Получаем значения из формы
      const title = modal.querySelector('#code-title').value.trim();
      const annotations = modal.querySelector('#code-annotations-text').value.trim();
      const lineNumbers = modal.querySelector('#line-numbers').value.trim();
      const highlightLines = modal.querySelector('#highlight-lines').value.trim();
      
      // Формируем параметры блока
      const attributes = [];
      
      // 1. Добавляем заголовок, если есть
      if (title) attributes.push(`title="${title}"`);
      
      // 2. Добавляем номера строк, если указаны
      if (lineNumbers) attributes.push(`linenums="${lineNumbers}"`);
      
      // 3. Добавляем подсветку строк, если указаны
      if (highlightLines) attributes.push(`hl_lines="${highlightLines}"`);
      
      // Формируем начало блока кода
      let codeBlock = '```';
      
      // Добавляем фигурные скобки, если есть параметры
      if (attributes.length > 0) {
          codeBlock += `{ .${lang.id} ${attributes.join(' ')}}`;
      } else {
          codeBlock += lang.id;
      }
      
      // Добавляем содержимое кода и закрывающие ```
      codeBlock += `\n${codeContent}\n\`\`\`\n`;
      
      // Добавляем аннотации, если они есть
      if (annotations) {
          // Получаем весь документ
          const fullDoc = Editor.cmInstance.getDoc().getValue();
          
          // Удаляем старые аннотации, если они есть
          let docWithoutAnnotations = fullDoc;
          const annotationsRegex = /(?:^|\n) {4}.+?(?=\n|$)/g;
          docWithoutAnnotations = docWithoutAnnotations.replace(annotationsRegex, '');
          
          // Добавляем новые аннотации в конец документа
          const newAnnotations = annotations.split('\n')
              .map(line => line.trim() ? '    ' + line : '')
              .join('\n');
          
          codeBlock += '\n' + newAnnotations;
      }

      // Проверяем редактируем ли существующий блок
      const editingBlock = modal.dataset.editingBlock ? 
          JSON.parse(modal.dataset.editingBlock) : null;
      
      // Вставляем код в редактор
      if (typeof Editor !== 'undefined' && Editor.insertAtCursor) {
          if (editingBlock) {
              // Заменяем существующий блок кода
              const doc = Editor.cmInstance.getDoc();
              doc.replaceRange(
                  codeBlock.split('\n'),
                  { line: editingBlock.startLine, ch: 0 },
                  { 
                      line: editingBlock.annotationEndLine, 
                      ch: Editor.cmInstance.getLine(editingBlock.annotationEndLine).length 
                  }
              );
          } else {
              // Вставляем новый блок кода
              Editor.insertAtCursor(codeBlock);
          }
          
          // Подсвечиваем вставленный блок (анимация)
          if (Editor.cmInstance) {
              const doc = Editor.cmInstance.getDoc();
              const cursor = doc.getCursor();
              const lines = codeBlock.split('\n').length;
              
              const mark = doc.markText(
                  { line: cursor.line, ch: 0 },
                  { line: cursor.line + lines - 1, ch: 0 },
                  {
                      className: 'highlight-insertion',
                      inclusiveLeft: true,
                      inclusiveRight: true
                  }
              );
              
              // Убираем подсветку через 1.5 секунды
              setTimeout(() => mark.clear(), 1500);
          }
      } else if (this.codeEditor) {
          // Fallback для случая, когда Editor не доступен
          const doc = this.codeEditor.getDoc();
          const cursor = doc.getCursor();
          doc.replaceRange(codeBlock, cursor);
      } else {
          console.error('Не удалось вставить код: редактор не доступен');
          showNotification('Не удалось вставить код', 'error');
      }
      
      // Закрываем модальное окно
      this.closeModal();
  }
};

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  CodeBlockModal.init();
});