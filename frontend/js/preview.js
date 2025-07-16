class MkDocsPreview {
  constructor() {
    this.previewContainer = document.getElementById('preview-content');
    this.currentContent = '';
    this.markedLoaded = false;
    this.isPreviewVisible = true;
    this.highlightJsLoaded = false;
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
      await this.loadMarked();
      await this.loadHighlightJs();
    } catch (error) {
      console.error('Failed to load dependencies:', error);
      this.showError('Failed to load required resources');
    }
  }

  async loadMarked() {
      if (this.markedLoaded) return;
      
      // Проверяем, возможно marked уже загружен
      if (typeof marked !== 'undefined') {
          this.markedLoaded = true;
          return;
      }
      
      // Пытаемся использовать локальный файл
      try {
          // Предполагаем, что marked.min.js уже подключен в index.html
          if (typeof marked === 'undefined') {
              throw new Error('marked.js not loaded');
          }
          this.markedLoaded = true;
      } catch (error) {
          console.error('Failed to load marked.js locally', error);
          // Можно добавить fallback на CDN здесь, если нужно
      }
  }

  async loadHighlightJs() {
    if (this.highlightJsLoaded || typeof hljs !== 'undefined') {
      this.highlightJsLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      // Создаем элемент для стилей
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/vendor/default.min.css';
      document.head.appendChild(link);

      // Загружаем скрипт highlight.js
      const script = document.createElement('script');
      script.src = 'assets/vendor/highlight.min.js';
      script.onload = () => {
        // Инициализируем подсветку для всех блоков кода
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
          // Добавляем нумерацию строк, если подключена библиотека
          if (typeof hljs.lineNumbersBlock === 'function') {
            hljs.lineNumbersBlock(block);
          }
        });
        this.highlightJsLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load highlight.js');
        reject(new Error('Failed to load highlight.js'));
      };
      document.head.appendChild(script);
    });
  }

  async refresh(content = null) {
      if (!this.isPreviewVisible) return;

      try {
          if (content) this.currentContent = content;
          
          // Убедимся, что marked.js загружен
          await this.loadMarked();
          
          // Убедимся, что highlight.js загружен
          if (typeof hljs === 'undefined') {
              await new Promise(resolve => {
                  const checkInterval = setInterval(() => {
                      if (typeof hljs !== 'undefined') {
                          clearInterval(checkInterval);
                          resolve();
                      }
                  }, 100);
              });
          }

          const processed = this.processContent(this.currentContent);
          const html = marked.parse(processed);
          this.updatePreview(html);
          
          // Применяем подсветку синтаксиса
          if (typeof hljs !== 'undefined') {
              this.previewContainer.querySelectorAll('pre code').forEach((block) => {
                  hljs.highlightElement(block);
              });
          }
      } catch (error) {
          console.error('Preview error:', error);
          this.showError('Failed to render preview');
      }
  }

  applySyntaxHighlighting() {
    if (typeof hljs !== 'undefined' && this.previewContainer) {
      this.previewContainer.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }

  processContent(markdown) {
    return markdown
      .replace(/^!!! (\w+)(?:\s+"(.+)")?/gm, '<div class="admonition $1">\n<p class="admonition-title">$2</p>')
      .replace(/^\?\?\? (\w+)(?:\s+"(.+)")?/gm, '<details class="admonition $1">\n<summary>$2</summary>')
      .replace(/^=== "(.+)"$/gm, '<div class="tab">\n<h3>$1</h3>')
      .replace(/^\s*$/gm, (m, offset, str) => {
        const prevLine = str.substring(0, offset).split('\n').pop();
        return prevLine?.startsWith('<div class="admonition') ? '</div>' : 
               prevLine?.startsWith('<details') ? '</details>' :
               prevLine?.startsWith('<div class="tab"') ? '</div>' : m;
      });
  }

  updatePreview(html) {
    if (!this.previewContainer) return;
    
    this.previewContainer.innerHTML = `
      <div class="markdown-body">
        ${html || 'Preview will appear here'}
      </div>
    `;
  }

  showError(message) {
    if (!this.previewContainer) return;
    
    this.previewContainer.innerHTML = `
      <div class="preview-error">
        <i class="mdi mdi-alert-circle"></i>
        <span>${message}</span>
      </div>
    `;
  }
}

const Preview = new MkDocsPreview();

