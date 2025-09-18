class MkDocsPreview {
  constructor() {
    this.previewContainer = document.getElementById('preview-content');
    this.currentContent = '';
    this.isPreviewVisible = true;
    this.highlightJsLoaded = false;
    this.mdiLoaded = false;
    this.setupEventListeners();
  }

  init() {
    if (!this.previewContainer) {
      console.error('Preview container not found');
      return;
    }
    this.loadDependencies();
  }

  async loadDependencies() {
    try {
      await Promise.all([
        this.loadHighlightJs(),
        this.loadMdi()
      ]);
    } catch (error) {
      console.error('Failed to load dependencies:', error);
    }
  }

  async loadMdi() {
    if (this.mdiLoaded) return;
    
    return new Promise((resolve) => {
      if (document.querySelector('link[href*="materialdesignicons"]')) {
        this.mdiLoaded = true;
        return resolve();
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@mdi/font@6.9.96/css/materialdesignicons.min.css';
      link.onload = () => {
        this.mdiLoaded = true;
        resolve();
      };
      link.onerror = () => {
        console.warn('Failed to load MDI CSS');
        resolve();
      };
      document.head.appendChild(link);
    });
  }

    async loadHighlightJs() {
    if (this.highlightJsLoaded) return;

    return new Promise((resolve) => {
      if (typeof hljs !== 'undefined') {
        this.initHighlightJs();
        return resolve();
      }

      const script = document.createElement('script');
      script.src = 'assets/vendor/highlightjs/highlight.min.js';
      script.onload = () => {
        const lineNumbersScript = document.createElement('script');
        lineNumbersScript.src = 'assets/vendor/highlightjs/highlightjs-line-numbers.min.js';
        lineNumbersScript.onload = () => {
          this.initHighlightJs();
          resolve();
        };
        lineNumbersScript.onerror = () => {
          console.warn('Failed to load line numbers plugin');
          this.initHighlightJs();
          resolve();
        };
        document.head.appendChild(lineNumbersScript);
      };
      script.onerror = () => {
        console.warn('Failed to load highlight.js');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('mkdocs-admonition-title')) {
        const admonition = e.target.closest('.mkdocs-admonition.collapsible');
        if (admonition) {
          admonition.classList.toggle('closed');
        }
      }
    });

    document.addEventListener("click", (e) => {
      const title = e.target.closest(".mkdocs-admonition.collapsible .mkdocs-admonition-title");
      if (!title) return;

      const container = title.parentElement;
      const content = container.querySelector(".mkdocs-admonition-content");

      if (container.classList.contains("open")) {
        // закрыть
        content.style.height = content.scrollHeight + "px"; // фиксируем высоту
        requestAnimationFrame(() => {
          content.style.height = "0";
        });
        container.classList.remove("open");
      } else {
        // открыть
        content.style.height = content.scrollHeight + "px";
        content.addEventListener("transitionend", () => {
          if (container.classList.contains("open")) {
            content.style.height = "auto";
          }
        }, { once: true });
        container.classList.add("open");
      }
    });
  }

  initHighlightJs() {
      if (typeof hljs === 'undefined') return;
      
      document.querySelectorAll('pre code').forEach((block) => {
          // Подсветка синтаксиса
          hljs.highlightElement(block);
          
          // Нумерация строк
        if (block.dataset.linenos === 'true') {
          const startFrom = parseInt(block.dataset.linenostart) || 1;
          
          if (typeof hljs.lineNumbersBlock === 'function') {
            hljs.lineNumbersBlock(block, {
              singleLine: false,
              startFrom: startFrom
            });
          }
        }
        
        if (block.dataset.hlLines) {
          const lines = block.dataset.hlLines.split(',');
          const lineNumbers = block.querySelectorAll('.hljs-ln-numbers .hljs-ln-line');
          
          lines.forEach(range => {
            if (range.includes('-')) {
              const [start, end] = range.split('-').map(Number);
              for (let i = start; i <= end; i++) {
                if (lineNumbers[i - 1]) {
                  lineNumbers[i - 1].parentNode.classList.add('mkdocs-highlighted-line');
                }
              }
            } else {
              const lineNum = parseInt(range);
              if (lineNumbers[lineNum - 1]) {
                lineNumbers[lineNum - 1].parentNode.classList.add('mkdocs-highlighted-line');
              }
            }
          });
        }
      });
      
      this.highlightJsLoaded = true;
  }

  isLineHighlighted(hlLines, lineNumber) {
      if (!hlLines) return false;
      
      return hlLines.split(',').some(range => {
          if (range.includes('-')) {
              const [start, end] = range.split('-').map(Number);
              return lineNumber >= start && lineNumber <= end;
          }
          return parseInt(range) === lineNumber;
      });
  }

  refresh(content = null) {
    if (!this.isPreviewVisible) return;

    try {
      if (content) this.currentContent = content;
      
      let html = '';
      if (window.Editor?.cmInstance?.markdownRenderer) {
        const tempElement = document.createElement('div');
        window.Editor.cmInstance.markdownRenderer(tempElement, this.currentContent);
        html = tempElement.innerHTML;
      } else {
        // Используем transformPathsForPreview для экранирования HTML
        const processedContent = window.Editor?.transformPathsForPreview?.(this.currentContent) || this.currentContent;
        html = this.markdownToHtml(processedContent);
      }

      this.updatePreview(html);
      this.applySyntaxHighlighting();
    } catch (error) {
      console.error('Preview error:', error);
      this.showError('Failed to render preview');
    }
  }

  processFontAwesomeIcons(match, iconName) {
    // Удаляем префикс fontawesome- если он есть
    const cleanName = iconName.replace(/^fontawesome-/, '');
    // Определяем тип (solid/regular/brands)
    const type = cleanName.split('-')[0];
    const iconClass = type === 'brands' ? 'fab' : 
                    type === 'regular' ? 'far' : 'fas';
    const iconNameOnly = cleanName.replace(/^(regular|solid|brands)-/, '');
    return `<i class="${iconClass} fa-${iconNameOnly.replace(/-/g, ' ')}"></i>`;
  }

  processOcticons(match, iconName) {
    const cleanName = iconName.replace(/^octicons-/, '');
    const sizeMatch = cleanName.match(/-(\d+)$/);
    const size = sizeMatch ? sizeMatch[1] : '16';
    const name = cleanName.replace(/-\d+$/, '');
    return `<span class="octicon octicon-${name}" style="width: ${size}px; height: ${size}px;"></span>`;
  }

  processMaterialIcons(match, iconName) {
    const cleanName = iconName.replace(/^material-/, '');
    return `<span class="mdi mdi-${cleanName.replace(/-/g, '-')}"></span>`;
  }

  processSimpleIcons(match, iconName) {
    const cleanName = iconName.replace(/^simple-/, '');
    return `<span class="simple-icons simple-icons-${cleanName.replace(/-/g, '-')}"></span>`;
  }

  markdownToHtml(markdown) {
    // Нормализуем переносы строк
    markdown = (markdown || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Подготовка временных хранилищ
    const codeBlocks = [];
    const admonitions = [];
    const tempBlocks = [];

    // Обработка блоков кода с атрибутами
    markdown = markdown.replace(/```([a-z]*)\s*\{\s*([^}]*)\s*\}\s*\n([\s\S]*?)\n```/g,
      (match, lang, attrs, code) => {
        const id = `codeblock-${codeBlocks.length}`;
        codeBlocks.push({
          id,
          lang: lang || '',
          attributes: this.parseCodeBlockAttributes(attrs),
          code: this.escapeHtml(code.trim())
        });
        return `\n@@@code-${id}@@@\n`;
      });

    // Обычные блоки кода
    markdown = markdown.replace(/```([a-z]*)\n([\s\S]*?)\n```/g,
      (match, lang, code) => {
        const id = `codeblock-${codeBlocks.length}`;
        codeBlocks.push({
          id,
          lang: lang || '',
          attributes: {},
          code: this.escapeHtml(code.trim())
        });
        return `\n@@@code-${id}@@@\n`;
      });

    // Обработка admonitions (!!! и ???, включая заголовки и без них)
    markdown = markdown.replace(
      /^([!?]{3})(\+)?\s+(\w+)(?:\s+"([^"]*)")?\s*\n([\s\S]*?)(?=^\s*$|\n[!?]{3}\+?\s|\n```|\n#{1,6}\s|$)/gm,
      (match, marker, openFlag, type, customTitle, content) => {
        const id = `admonition-${admonitions.length}`;
        admonitions.push({
          id,
          type,
          title: customTitle !== undefined ? customTitle : this.getDefaultAdmonitionTitle(type),
          content: this.processAdmonitionContent(content.trim()),
          collapsible: marker === '???',
          open: !!openFlag,
          noTitle: customTitle === ""
        });
        return `\n@@@admonition-${id}@@@\n`;
      }
    );

    // Временное хранение оставшихся кодов/адмоннишинов
    markdown = markdown.replace(/```[\s\S]*?```/g, (match) => {
      const id = `temp-block-${tempBlocks.length}`;
      tempBlocks.push(match);
      return `@@@${id}@@@`;
    });
    markdown = markdown.replace(/^[!?]{3}[\s\S]*?^(?=\s*$|\n[!?]{3}|\n```|\n#{1,6}\s|$)/gm, (match) => {
      const id = `temp-admonition-${tempBlocks.length}`;
      tempBlocks.push(match);
      return `@@@${id}@@@`;
    });

    // --- ОБРАБОТКА ЦИТАТ С ПОДДЕРЖКОЙ ВЛОЖЕННОСТИ ---
    const lines = markdown.split('\n');
    let result = [];
    let quoteStack = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const quoteMatch = line.match(/^((?:(?:&gt;|>)(?:\s)*)+)(.*)$/);

      if (quoteMatch) {
        const rawMarkers = quoteMatch[1];
        const level = (rawMarkers.match(/&gt;|>/g) || []).length;
        const content = (quoteMatch[2] || '').trim();

        while (quoteStack.length > level) {
          result.push('</blockquote>\n');
          quoteStack.pop();
        }
        while (quoteStack.length < level) {
          result.push('<blockquote>\n');
          quoteStack.push(1);
        }

        if (content !== '') {
          result.push(content + '\n');
        }
        // если пустая строка — ничего не добавляем
      } else {
        while (quoteStack.length > 0) {
          result.push('</blockquote>\n');
          quoteStack.pop();
        }
        result.push(line + '\n');
      }
    }

    while (quoteStack.length > 0) {
      result.push('</blockquote>\n');
      quoteStack.pop();
    }
    markdown = result.join('');

    // Обработка изображений
    markdown = markdown.replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+(["'])(.*?)\3)?\)/g,
      (match, alt, src, quote, title) => {
        const fixedSrc = src.startsWith('images/') ? `/${src}` : src;
        let imgHtml = `<img src="${fixedSrc}" alt="${alt || ''}" class="mkdocs-image"`;
        if (title) imgHtml += ` title="${title}"`;
        imgHtml += '>';
        return imgHtml;
      }
    );

    // Иконки с атрибутами
    markdown = markdown.replace(
      /:([a-z0-9-]+):\{([^}]+)\}/g,
      (match, iconName, attrs) => {
        let iconHtml = '';
        if (iconName.startsWith('fontawesome-')) {
          iconHtml = this.processFontAwesomeIcons(match, iconName);
        } else if (iconName.startsWith('octicons-')) {
          iconHtml = this.processOcticons(match, iconName);
        } else if (iconName.startsWith('material-')) {
          iconHtml = this.processMaterialIcons(match, iconName);
        } else if (iconName.startsWith('simple-')) {
          iconHtml = this.processSimpleIcons(match, iconName);
        } else {
          return match;
        }

        const classMatches = attrs.match(/\.[a-zA-Z0-9_-]+/g) || [];
        if (classMatches.length > 0) {
          const existingClasses = iconHtml.match(/class="([^"]*)"/);
          const newClasses = classMatches.map(c => c.substring(1)).join(' ');
          if (existingClasses) {
            iconHtml = iconHtml.replace(/class="([^"]*)"/, `class="$1 ${newClasses}"`);
          } else {
            iconHtml = iconHtml.replace('>', ` class="${newClasses}">`);
          }
        }
        return iconHtml;
      }
    );

    // Обычные :icon:
    markdown = markdown.replace(
      /:([a-z0-9-]+):/g,
      (match, iconName) => {
        if (iconName.startsWith('fontawesome-')) {
          return this.processFontAwesomeIcons(match, iconName);
        } else if (iconName.startsWith('octicons-')) {
          return this.processOcticons(match, iconName);
        } else if (iconName.startsWith('material-')) {
          return this.processMaterialIcons(match, iconName);
        } else if (iconName.startsWith('simple-')) {
          return this.processSimpleIcons(match, iconName);
        }
        return match;
      }
    );

    // Ссылки
    markdown = markdown.replace(
      /\[([^\]]+)\]\(([^)]+)\)(?:\{([^}]+)\})?/g,
      (match, text, url, attrs) => {
        let linkHtml = `<a href="${url}"`;
        if (attrs) {
          const attributes = this.parseLinkAttributes(attrs);
          Object.keys(attributes).forEach(key => {
            linkHtml += ` ${key}="${attributes[key]}"`;
          });
        }
        linkHtml += `>${text}</a>`;
        return linkHtml;
      }
    );

    // Жирный, mark, ins, del и т.п.
    markdown = markdown.replace(/\*\*([^*]+)\*\*/g, (m,t) => `<strong>${t}</strong>`)
                      .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
                      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
                      .replace(/\^\^([^^]+)\^\^/g, '<ins>$1</ins>')
                      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
                      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
                      .replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Инлайн-код
    markdown = markdown.replace(
      /(^|[^`])`([^`]+)`([^`]|$)/g,
      (match, prefix, code, suffix) => `${prefix}<code>${this.escapeHtml(code)}</code>${suffix}`
    );

    // kbd (HTML и экранированный)
    markdown = markdown.replace(/<kbd>([\s\S]*?)<\/kbd>/gi, (m, c) => `<kbd class="mkdocs-kbd">${c}</kbd>`)
                      .replace(/&lt;kbd&gt;([\s\S]*?)&lt;\/kbd&gt;/gi, (m, c) => `<kbd class="mkdocs-kbd">${c}</kbd>`);

    // Заголовки
    markdown = markdown.replace(/^# (.*$)/gm, '<h1>$1</h1>')
                      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
                      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
                      .replace(/^###### (.*$)/gm, '<h6>$1</h6>');

    // Горизонтальная линия
    markdown = markdown.replace(/^---\s*$/gm, '<hr>');

    // ====== ОБРАБОТКА ПАРАГРАФОВ ======
    const blocks = markdown.split(/\n\s*\n/);
    markdown = blocks.map((block) => {
      const trimmed = (block || '').trim();
      if (!trimmed) return '';
      const structuralRegex = /^(@@@|<[/]?\w|```|\||^#{1,6}\s|^[-*+]\s|\d+\.\s|^\s*(?:&gt;|>)|^<blockquote|^<\/blockquote>)/i;
      if (structuralRegex.test(trimmed)) return block;
      const paragraph = block
        .split('\n')
        .map(line => this.processInlineMarkdown(line.trim()))
        .filter(Boolean)
        .join(' ');
      return `<p>${paragraph}</p>`;
    }).filter(Boolean).join('\n\n');

    // ====== ОБРАБОТКА СПИСКОВ ======
    const listLines = markdown.split('\n');
    let output = [];
    let inList = false;
    let listType = '';
    let currentParagraph = [];

    for (let i = 0; i < listLines.length; i++) {
      const line = listLines[i];
      const trimmedLine = line.trim();

      const isHeading = /^<h[1-6]>.*<\/h[1-6]>$/.test(trimmedLine);
      const isHr = trimmedLine === '<hr>';

      const taskMatch = trimmedLine.match(/^\s*([-*+])\s+\[( |x)\]\s+(.*)$/);
      const ulMatch = trimmedLine.match(/^\s*([-*+])\s+(.*)$/);
      const olMatch = trimmedLine.match(/^\s*(\d+)\.\s+(.*)$/);

      if (taskMatch || ulMatch || olMatch) {
        const isTask = !!taskMatch;
        const isOrdered = !!olMatch;
        const content = isTask ? taskMatch[3] : (isOrdered ? olMatch[2] : ulMatch[2]);
        const currentListType = isTask ? 'task' : (isOrdered ? 'ol' : 'ul');

        if (!inList || listType !== currentListType) {
          if (inList) {
            output.push(`</${listType}>`);
          }
          output.push(isTask ? '<ul class="contains-task-list">' : (isOrdered ? '<ol>' : '<ul>'));
          inList = true;
          listType = currentListType;
        }

        if (isTask) {
          const isChecked = taskMatch[2].toLowerCase() === 'x';
          output.push(`<li class="task-list-item"><input type="checkbox" ${isChecked ? 'checked' : ''} disabled> ${this.processInlineMarkdown(content)}</li>`);
        } else {
          output.push(`<li>${this.processInlineMarkdown(content)}</li>`);
        }

        if (currentParagraph.length > 0) {
          output.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
      } else if (trimmedLine.startsWith('@@@') || isHeading || isHr || trimmedLine === '') {
        if (inList) {
          output.push(`</${listType}>`);
          inList = false;
          listType = '';
        }

        if (currentParagraph.length > 0) {
          output.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }

        if (trimmedLine !== '') {
          output.push(line);
        }
      } else {
        if (inList) {
          output.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        currentParagraph.push(this.processInlineMarkdown(line));
      }
    }

    if (inList) {
      output.push(`</${listType}>`);
    }
    if (currentParagraph.length > 0) {
      output.push(`<p>${currentParagraph.join(' ')}</p>`);
    }

    markdown = output.join('\n');

    // Восстановление временных блоков
    markdown = markdown.replace(/@@@temp-(block|admonition)-(\d+)@@@/g, (match, type, index) => {
      return tempBlocks[parseInt(index)] || '';
    });

    // Восстановление блоков кода
    markdown = markdown.replace(/@@@code-([^@]+)@@@/g, (match, id) => {
      const block = codeBlocks.find(b => b.id === id);
      if (!block) return '';
      let html = '<div class="mkdocs-code-block">';
      if (block.attributes.title) html += `<div class="mkdocs-code-title">${block.attributes.title}</div>`;
      const lineNumbers = block.attributes.linenums || block.attributes.linenos;
      const startFrom = parseInt(block.attributes.linenostart || block.attributes['line-start'] || 1);
      const hlLines = block.attributes.hl_lines || block.attributes['highlight-lines'];
      html += '<pre><code';
      if (block.lang) html += ` class="language-${block.lang}"`;
      if (lineNumbers) html += ` data-linenos="true" data-linenostart="${startFrom}"`;
      if (hlLines) html += ` data-hl-lines="${hlLines}"`;
      html += '>';
      html += block.code + '</code></pre></div>';
      return html;
    });

    // Восстановление admonitions
    markdown = markdown.replace(/@@@admonition-([^@]+)@@@/g, (match, id) => {
      const admonition = admonitions.find(a => a.id === id);
      if (!admonition) return '';

      const icon = this.getAdmonitionIcon(admonition.type);
      const classes = [
        "mkdocs-admonition",
        admonition.type,
        admonition.collapsible ? "collapsible" : "",
        admonition.open ? "open" : "",
        admonition.noTitle ? "no-title" : ""
      ].filter(Boolean).join(" ");

      if (admonition.noTitle) {
        return `
          <div class="${classes}">
            <div class="mkdocs-admonition-content">
              ${admonition.content}
            </div>
          </div>`;
      }

      const displayTitle = admonition.title || this.getDefaultAdmonitionTitle(admonition.type);

      return `
        <div class="${classes}">
          <div class="mkdocs-admonition-title">
            <span class="mdi mdi-${icon}"></span>
            <span>${displayTitle}</span>
          </div>
          <div class="mkdocs-admonition-content">
            ${admonition.content}
          </div>
        </div>`;
    });


    // Чистим пустые абзацы окончательно
    //markdown = markdown.replace(/<p>\s*<\/p>/g, '');
    console.log("=== BEFORE CLEANUP ===");
    console.log(markdown.slice(0, 1000).replace(/\n/g, '\\n'));

    // === Финальная чистка пустых параграфов ===
    // Убираем пустые <p></p> и <p><blockquote>...</p>
    markdown = markdown
      .replace(/<p>\s*<\/p>/g, '')                // чисто пустые абзацы
      .replace(/<p>(\s*<blockquote>)/g, '$1')    // убираем <p> перед blockquote
      .replace(/(<\/blockquote>)\s*<\/p>/g, '$1'); // убираем </p> после blockquote
    console.log("=== AFTER CLEANUP ===");
    console.log(markdown.slice(0, 1000).replace(/\n/g, '\\n'));

      return markdown;
    }

  parseLinkAttributes(attrsStr) {
      const attributes = {};
      if (!attrsStr) return attributes;
      
      // Обработка классов (.class1 .class2)
      const classMatches = attrsStr.match(/\.[a-zA-Z0-9_-]+/g) || [];
      if (classMatches.length > 0) {
          attributes.class = classMatches.map(c => c.substring(1)).join(' ');
      }
      
      // Обработка параметров (key="value" или key=value)
      const kvRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^'"\s]+))/g;
      let match;
      while ((match = kvRegex.exec(attrsStr)) !== null) {
          const key = match[1];
          const value = match[2] || match[3] || match[4];
          attributes[key] = value;
      }
      
      // Обработка отдельных флагов (без значений)
      const flagRegex = /:([a-zA-Z0-9_-]+)/g;
      while ((match = flagRegex.exec(attrsStr)) !== null) {
          const flag = match[1];
          attributes[flag] = true;
      }
      
      return attributes;
  }

  processAdmonitionContent(content) {
      const lines = content.split('\n');
      const minIndent = this.getMinIndent(lines.filter(line => line.trim()));
      
      return lines.map(line => {
          if (line.trim() === '') return line;
          
          // Удаляем минимальный отступ
          const indentToRemove = Math.min(minIndent, line.match(/^\s*/)[0].length);
          line = line.substring(indentToRemove);
          
          return this.processInlineMarkdown(line);
      }).join('\n');
  }

  // Обработка отдельных блоков кода
  processCodeBlock(block) {
      // Обработка блоков кода с атрибутами
      const codeMatch = block.match(/^```([a-z]*)\s*(\{.*?\})?\n([\s\S]*?)\n```$/);
      if (codeMatch) {
          const lang = codeMatch[1] || '';
          const attrs = codeMatch[2] || '';
          const code = this.escapeHtml(codeMatch[3].trim());
          
          let html = '<div class="mkdocs-code-block">';
          if (lang) html += `<pre><code class="language-${lang}">${code}</code></pre>`;
          else html += `<pre><code>${code}</code></pre>`;
          html += '</div>';
          
          return html;
      }
      return block;
  }

  // Обработка inline markdown
  processInlineMarkdown(line) {
      if (line.trim() === '') return line;
      
      line = line
          // Жирный текст
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          // Жирный + курсив (тройные подчеркивания)
          .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
          // Жирный текст
          .replace(/__([^_]+)__/g, '<strong>$1</strong>')
          // Курсив
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          // Выделенный текст (mark)
          .replace(/==([^=]+)==/g, '<mark>$1</mark>')
          // Подчеркнутый текст (ins)
          .replace(/\^\^([^^]+)\^\^/g, '<ins>$1</ins>')
          // Зачеркнутый текст (del)
          .replace(/~~([^~]+)~~/g, '<del>$1</del>')
          // Жирный + курсив (тройные звездочки)
          .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
          // Инлайн-код
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          // Обработка {: .mdi .mdi-icon :}
          .replace(/\{:([^:]+):\}/g, (match, attrs) => {
              const classes = (attrs.match(/\.[a-z0-9-]+/g) || [])
                  .map(c => c.substring(1))
                  .filter(c => c.startsWith('mdi-'));
              
              if (classes.length) {
                  if (!classes.includes('mdi')) classes.unshift('mdi');
                  return `<span class="${classes.join(' ')}"></span>`;
              }
              return '';
          })
          // Обработка :fontawesome-icon:
          .replace(/:([a-z0-9-]+):/g, (match, iconName) => {
              if (iconName.startsWith('fontawesome-')) {
                  return this.processFontAwesomeIcons(match, iconName);
              }
              return match;
          })
          // Корректная обработка тега <kbd> (учитывает переносы внутри)
          .replace(/<kbd>([\s\S]*?)<\/kbd>/gi, (match, key) => {
            //console.log('KBD html match:', key);
            return `<kbd class="mkdocs-kbd">${key}</kbd>`;
          })
          .replace(/&lt;kbd&gt;([\s\S]*?)&lt;\/kbd&gt;/gi, (match, key) => {
            //console.log('KBD escaped match:', key);
            return `<kbd class="mkdocs-kbd">${key}</kbd>`;
          });
      //console.log('Inline after:', line);
      return line;
  }

  // Получение минимального отступа для группы строк
  getMinIndent(lines) {
      let minIndent = Infinity;
      
      for (const line of lines) {
          if (line.trim() === '') continue;
          
          const indent = line.match(/^\s*/)[0].length;
          if (indent < minIndent) {
              minIndent = indent;
              if (minIndent === 0) break;
          }
      }
      
      return minIndent === Infinity ? 0 : minIndent;
  }

  // Вынесенная обработка MDI иконок
  processMdiIcons(match, attrs) {
      const classes = (attrs.match(/\.([a-z0-9-]+)/g) || [])
          .map(c => c.substring(1))
          .filter(c => c.startsWith('mdi-'));
      
      if (classes.length) {
          if (!classes.includes('mdi')) classes.unshift('mdi');
          return `<span class="${classes.join(' ')}"></span>`;
      }
      return '';
  }

  // Метод для получения иконок admonitions
  getAdmonitionIcon(type) {
      const icons = {
          note: 'information',
          warning: 'alert',
          danger: 'alert-octagon',
          tip: 'lightbulb-on',
          success: 'check-circle',
          info: 'information-outline',
          example: 'lightbulb-on-outline'
      };
      return icons[type] || 'information';
  }

  // Новый метод для получения заголовка по умолчанию
  getDefaultAdmonitionTitle(type) {
      // Преобразуем тип в заголовок с первой заглавной буквой
      return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe.toString()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
  };

  // Метод для проверки и исправления путей (опционально)
  fixImagePath(src) {
    if (!src) return '';
    
    // Оставляем без изменений абсолютные пути и URL
    if (src.startsWith('http') || src.startsWith('/') || src.startsWith('data:')) {
      return src;
    }
    
    // Добавляем /images/ к относительным путям
    return src.startsWith('images/') ? `/${src}` : `/images/${src}`;
  }

  parseCodeBlockAttributes(attrsStr) {
      const attributes = {};
      if (!attrsStr) return attributes;
      
      // 1. Обработка классов и языка (.python, .javascript и т.д.)
      const classMatches = attrsStr.match(/\.[a-zA-Z0-9_-]+/g) || [];
      classMatches.forEach(c => {
          const className = c.substring(1);
          // Если это первый класс - считаем его языком
          if (!attributes.lang && !attributes.language && 
              ['python','javascript','css','html','bash','json','yaml','xml','php','java','c','cpp','go','ruby','rust','swift','kotlin','scala','typescript'].includes(className)) {
              attributes.lang = className;
              attributes.language = className;
          } else {
              // Остальные классы добавляем как CSS-классы
              attributes.class = (attributes.class ? attributes.class + ' ' : '') + className;
          }
      });
      
      // 2. Исправленная обработка параметров (key="value" или key=value)
      const kvRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^'"\s]+))/g;
      let match;
      while ((match = kvRegex.exec(attrsStr)) !== null) {
          const key = match[1];
          const value = match[2] || match[3] || match[4];
          attributes[key] = value;
      }
      
      return attributes;
  }

  applySyntaxHighlighting() {
    if (this.highlightJsLoaded) {
      this.initHighlightJs();
    }
  }

  updatePreview(html) {
    if (!this.previewContainer) return;
    
    this.previewContainer.innerHTML = `
      <div class="mkdocs-preview-container">
        ${html || 'Preview will appear here'}
      </div>
    `;
  }

  showError(message) {
    if (!this.previewContainer) return;
    
    this.previewContainer.innerHTML = `
      <div class="mkdocs-preview-error">
        <i class="mkdocs-mdi-icon mdi-alert-circle"></i>
        <span>${message}</span>
      </div>
    `;
  }
}

const Preview = new MkDocsPreview();
document.addEventListener('DOMContentLoaded', () => Preview.init());






