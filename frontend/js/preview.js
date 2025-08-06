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
      script.src = 'assets/vendor/highlight.min.js';
      script.onload = () => {
        const lineNumbersScript = document.createElement('script');
        lineNumbersScript.src = 'assets/vendor/highlightjs-line-numbers.min.js';
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
  }

  initHighlightJs() {
    if (typeof hljs === 'undefined') return;
    
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
      
      if (block.dataset.linenos && typeof hljs.lineNumbersBlock === 'function') {
        hljs.lineNumbersBlock(block, {
          singleLine: false,
          startFrom: parseInt(block.dataset.linenostart) || 1
        });
      }
      
      if (block.dataset.hlLines) {
        const lines = block.dataset.hlLines.split(',').map(Number);
        const lineNumbers = block.querySelectorAll('.hljs-ln-numbers .hljs-ln-line');
        lines.forEach(line => {
          if (lineNumbers[line - 1]) {
            lineNumbers[line - 1].parentNode.classList.add('mkdocs-highlighted-line');
          }
        });
      }
    });
    
    this.highlightJsLoaded = true;
  }

  // refresh(content = null) {
  //   if (!this.isPreviewVisible) return;

  //   try {
  //     if (content) this.currentContent = content;
      
  //     let html = '';
  //     if (window.Editor?.cmInstance?.markdownRenderer) {
  //       const tempElement = document.createElement('div');
  //       window.Editor.cmInstance.markdownRenderer(tempElement, this.currentContent);
  //       html = tempElement.innerHTML;
  //     } else {
  //       html = this.markdownToHtml(this.currentContent);
  //     }

  //     this.updatePreview(html);
  //     this.applySyntaxHighlighting();
  //   } catch (error) {
  //     console.error('Preview error:', error);
  //     this.showError('Failed to render preview');
  //   }
  // }
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

// markdownToHtml(markdown) {
//     // Обработка блоков кода с атрибутами
//     const codeBlocks = [];
//     markdown = markdown.replace(/```([a-z]*)\s*{([^}]*)}?\n([\s\S]*?)\n```/g, 
//       (match, lang, attrs, code) => {
//         const attributes = this.parseCodeBlockAttributes(attrs);
//         const id = `codeblock-${codeBlocks.length}`;
        
//         codeBlocks.push({
//             id,
//             lang,
//             attributes,
//             code: this.escapeHtml(code.trim())
//         });
//         return `\n@@@${id}@@@\n`;
//     });
    
//     // Обработка обычных блоков кода (без атрибутов)
//     markdown = markdown.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, 
//       (match, lang, code) => {
//         const id = `codeblock-${codeBlocks.length}`;
//         codeBlocks.push({
//             id,
//             lang,
//             attributes: {},
//             code: this.escapeHtml(code.trim())
//         });
//         return `\n@@@${id}@@@\n`;
//     });

//     // Обработка изображений
//     markdown = markdown.replace(
//       /!\[([^\]]+)\]\(([^)]+)\)/g, 
//       (match, alt, src) => {
//         const fixedSrc = src.startsWith('images/') ? `/${src}` : src;
//         return `<img src="${fixedSrc}" alt="${alt}" class="mkdocs-image">`;
//       }
//     );

//     // Обработка заголовков
//     markdown = markdown.replace(/^# (.*$)/gm, '<h1>$1</h1>')
//       .replace(/^## (.*$)/gm, '<h2>$1</h2>')
//       .replace(/^### (.*$)/gm, '<h3>$1</h3>')
//       .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
//       .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
//       .replace(/^###### (.*$)/gm, '<h6>$1</h6>');

//     // Обработка admonitions
//     markdown = markdown.replace(
//       /^!!!\s+(\w+)(?:\s+"([^"]+)")?\n([\s\S]*?)(?=\n!!!|\n```|\n#{1,6}\s|\n$)/gm,
//       (match, type, title, content) => {
//         const defaultTitles = {
//           note: "Note",
//           warning: "Warning",
//           danger: "Danger",
//           tip: "Tip",
//           success: "Success",
//           info: "Info"
//         };
        
//         const displayTitle = title || defaultTitles[type] || type;
//         const icon = this.getAdmonitionIcon(type);
        
//         return `
//           <div class="mkdocs-admonition ${type}">
//             <div class="mkdocs-admonition-title">
//               <i class="mkdocs-mdi-icon mdi-${icon}"></i>
//               <span>${displayTitle}</span>
//             </div>
//             <div class="mkdocs-admonition-content">
//               ${content.trim()}
//             </div>
//           </div>
//         `;
//       }
//     );

//     // Восстановление блоков кода
//     markdown = markdown.replace(/@@@([^@]+)@@@/g, (match, id) => {
//         const block = codeBlocks.find(b => b.id === id);
//         if (!block) return '';
        
//         let html = '<div class="mkdocs-code-block">';
        
//         // Добавляем заголовок если есть
//         if (block.attributes.title) {
//           html += `<div class="mkdocs-code-title">${block.attributes.title}</div>`;
//         }
        
//         // Подготовка атрибутов для highlight.js
//         const lineNumbers = block.attributes.linenums || block.attributes.linenos;
//         const startFrom = parseInt(block.attributes.linenostart || block.attributes['line-start'] || 1);
//         const hlLines = block.attributes.hl_lines || block.attributes['highlight-lines'];
        
//         html += '<pre><code';
//         if (block.lang) html += ` class="language-${block.lang}"`;
//         if (lineNumbers) html += ` data-linenos data-linenostart="${startFrom}"`;
//         if (hlLines) html += ` data-hl-lines="${hlLines}"`;
//         html += '>';
        
//         html += block.code + '</code></pre></div>';
//         return html;
//     });

//     return markdown;
// }
markdownToHtml(markdown) {
    // Нормализуем переносы строк
    markdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Обработка блоков кода с атрибутами
    const codeBlocks = [];
    markdown = markdown.replace(/```([a-z]*)\s*{([^}]*)}?\n([\s\S]*?)\n```/g, 
      (match, lang, attrs, code) => {
        const attributes = this.parseCodeBlockAttributes(attrs);
        const id = `codeblock-${codeBlocks.length}`;
        
        codeBlocks.push({
            id,
            lang,
            attributes,
            code: this.escapeHtml(code.trim())
        });
        return `\n@@@${id}@@@\n`;
    });
    
    // Обработка обычных блоков кода (без атрибутов)
    markdown = markdown.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, 
      (match, lang, code) => {
        const id = `codeblock-${codeBlocks.length}`;
        codeBlocks.push({
            id,
            lang,
            attributes: {},
            code: this.escapeHtml(code.trim())
        });
        return `\n@@@${id}@@@\n`;
    });

    // Обработка изображений
    markdown = markdown.replace(
      /!\[([^\]]+)\]\(([^)]+)\)/g, 
      (match, alt, src) => {
        const fixedSrc = src.startsWith('images/') ? `/${src}` : src;
        return `<img src="${fixedSrc}" alt="${alt}" class="mkdocs-image">`;
      }
    );

    // Обработка заголовков
    markdown = markdown.replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gm, '<h6>$1</h6>');

    // Улучшенная обработка admonitions
    markdown = markdown.replace(
      /^!!!\s+(\w+)(?:\s+"([^"]+)")?\n([\s\S]*?)(?=\n!!!|\n```|\n#{1,6}\s|\n$)/gm,
      (match, type, title, content) => {
        const defaultTitles = {
          note: "Note",
          warning: "Warning",
          danger: "Danger",
          tip: "Tip",
          success: "Success",
          info: "Info"
        };
        
        const displayTitle = title || defaultTitles[type] || type;
        const icon = this.getAdmonitionIcon(type);
        
        // Обрабатываем переносы строк в содержимом
        const processedContent = content.trim()
          .split('\n')
          .map(line => line.trim() ? `<p>${line}</p>` : '')
          .join('');
        
        return `
          <div class="mkdocs-admonition ${type}">
            <div class="mkdocs-admonition-title">
              <i class="mkdocs-mdi-icon mdi-${icon}"></i>
              <span>${displayTitle}</span>
            </div>
            <div class="mkdocs-admonition-content">
              ${processedContent}
            </div>
          </div>
        `;
      }
    );

    // Обработка переносов строк в обычном тексте
    markdown = markdown.split('\n').map(line => {
      if (/^#|^```|^!!!|^<|^@@@/.test(line.trim())) {
        return line; // Не обрабатываем специальные строки
      }
      return line.trim() ? `<p>${line}</p>` : '';
    }).join('');

    // Восстановление блоков кода
    markdown = markdown.replace(/@@@([^@]+)@@@/g, (match, id) => {
        const block = codeBlocks.find(b => b.id === id);
        if (!block) return '';
        
        let html = '<div class="mkdocs-code-block">';
        
        if (block.attributes.title) {
          html += `<div class="mkdocs-code-title">${block.attributes.title}</div>`;
        }
        
        const lineNumbers = block.attributes.linenums || block.attributes.linenos;
        const startFrom = parseInt(block.attributes.linenostart || block.attributes['line-start'] || 1);
        const hlLines = block.attributes.hl_lines || block.attributes['highlight-lines'];
        
        html += '<pre><code';
        if (block.lang) html += ` class="language-${block.lang}"`;
        if (lineNumbers) html += ` data-linenos data-linenostart="${startFrom}"`;
        if (hlLines) html += ` data-hl-lines="${hlLines}"`;
        html += '>';
        
        html += block.code + '</code></pre></div>';
        return html;
    });

    return markdown;
}

getAdmonitionIcon(type) {
    const icons = {
        note: 'information',
        warning: 'alert',
        danger: 'alert-octagon',
        tip: 'lightbulb-on',
        success: 'check-circle',
        info: 'information-outline'
    };
    return icons[type] || 'information';
};

escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

  parseCodeBlockAttributes(attrsStr) {
    const attributes = {};
    if (!attrsStr) return attributes;
    
    const classMatch = attrsStr.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatch) {
      attributes.class = classMatch.map(c => c.substring(1)).join(' ');
    }
    
    const kvPairs = attrsStr.match(/(\w+)="([^"]*)"/g) || [];
    kvPairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim().replace(/"/g, ''));
      attributes[key] = value;
    });
    
    return attributes;
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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




