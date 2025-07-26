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
    
    try {
      if (typeof marked === 'undefined') {
        // Попробуйте явно загрузить marked.js
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      marked.setOptions({
        baseUrl: '/',
        breaks: true,
        gfm: true
      });
      this.markedLoaded = true;
    } catch (error) {
      console.error('Failed to load marked.js:', error);
      throw error;
    }
  }

  async loadHighlightJs() {
    if (this.highlightJsLoaded) return;

    return new Promise((resolve) => {
      // Проверяем, возможно hljs уже загружен
      if (typeof hljs !== 'undefined') {
        this.initHighlightJs();
        resolve();
        return;
      }

      // Загружаем стили
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/vendor/highlightjs/default.min.css';
      document.head.appendChild(link);

      // Загружаем скрипт highlight.js
      const script = document.createElement('script');
      script.src = 'assets/vendor/highlightjs/highlight.min.js';
      script.onload = () => {
        // Теперь загружаем плагин нумерации строк
        const lineNumbersScript = document.createElement('script');
        lineNumbersScript.src = 'assets/vendor/highlightjs/highlightjs-line-numbers.min.js';
        lineNumbersScript.onload = () => {
          this.initHighlightJs();
          resolve();
        };
        lineNumbersScript.onerror = (e) => {
          console.error('Failed to load line numbers plugin', e);
          this.initHighlightJs(); // Все равно инициализируем highlight.js
          resolve();
        };
        document.head.appendChild(lineNumbersScript);
      };
      script.onerror = (e) => {
        console.error('Failed to load highlight.js', e);
        reject(new Error('Failed to load highlight.js'));
      };
      document.head.appendChild(script);
    });
  }

  initHighlightJs() {
    if (typeof hljs === 'undefined') return;
    
    // Инициализируем highlight.js
    hljs.highlightAll();
    
    // Инициализируем нумерацию строк, если плагин загружен
    if (typeof hljs.lineNumbersBlock === 'function') {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.lineNumbersBlock(block);
      });
    }
    
    this.highlightJsLoaded = true;
  }
// Конец нового кода
  async refresh(content = null) {
    if (!this.isPreviewVisible) return;

    try {
      if (content) this.currentContent = content;
      
      await this.loadMarked();
      await this.loadHighlightJs();

      const processed = this.processContent(this.currentContent);
      const html = marked.parse(processed);
      this.updatePreview(html);
      
      // Применяем подсветку после обновления контента
      this.initHighlightJs();
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
    // Сначала обрабатываем специальные блоки (admonitions, tabs)
    let processed = markdown
      .replace(/^!!! (\w+)(?:\s+"(.+)")?/gm, '<div class="admonition $1">\n<p class="admonition-title">$2</p>')
      .replace(/^\?\?\? (\w+)(?:\s+"(.+)")?/gm, '<details class="admonition $1">\n<summary>$2</summary>')
      .replace(/^=== "(.+)"$/gm, '<div class="tab">\n<h3>$1</h3>')
      .replace(/^\s*$/gm, (m, offset, str) => {
        const prevLine = str.substring(0, offset).split('\n').pop();
        return prevLine?.startsWith('<div class="admonition') ? '</div>' : 
              prevLine?.startsWith('<details') ? '</details>' :
              prevLine?.startsWith('<div class="tab"') ? '</div>' : m;
      });

    // Затем обрабатываем пути изображений для предпросмотра
    processed = processed.replace(
      /\]\(images\/([^)]+)\)/g, 
      '](/images/$1)'
    );

    return processed;
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

