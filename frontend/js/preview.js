class MkDocsPreview {
  constructor() {
    this.previewContainer = document.getElementById('preview-content');
    this.currentContent = '';
    this.isPreviewVisible = true;
    this.highlightJsLoaded = false;
    this.materialStylesLoaded = false;
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
        this.loadMaterialStyles()
      ]);
    } catch (error) {
      console.error('Failed to load dependencies:', error);
    }
  }

  async loadMaterialStyles() {
    if (this.materialStylesLoaded) return;
    
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/material-preview.css';
      link.onload = () => {
        this.materialStylesLoaded = true;
        resolve();
      };
      link.onerror = () => {
        console.warn('Failed to load material-preview.css');
        resolve();
      };
      document.head.appendChild(link);
    });
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
        resolve(); // Продолжаем даже если не удалось загрузить highlight.js
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

  refresh(content = null) {
    if (!this.isPreviewVisible) return;

    try {
      if (content) this.currentContent = content;
      
      // Получаем HTML либо из CodeMirror, либо из простого преобразования
      let html = '';
      if (window.Editor?.cmInstance?.markdownRenderer) {
        const tempElement = document.createElement('div');
        window.Editor.cmInstance.markdownRenderer(tempElement, this.currentContent);
        html = tempElement.innerHTML;
      } else {
        // Fallback для простого отображения, если CodeMirror не доступен
        html = this.simpleMarkdownToHtml(this.currentContent);
      }
      this.updatePreview(html);
      
      // Применяем подсветку после обновления контента
      this.applySyntaxHighlighting();
    } catch (error) {
      console.error('Preview error:', error);
      this.showError('Failed to render preview');
    }
  }

  simpleMarkdownToHtml(markdown) {
      // Сначала экранируем HTML во всем содержимом
      const escapeHtml = (unsafe) => {
          return unsafe
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
      };
      
      // Обработка блоков кода с экранированием
      markdown = markdown.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, 
          (match, lang, code) => {
              return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
          });
      
      // Остальные замены остаются без изменений
      markdown = markdown.replace(/^!!! (\w+)(?:\s+"(.+)")?/gm, 
          '<div class="admonition $1"><p class="admonition-title">$2</p>');
      
      markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/g, 
          '<img alt="$1" src="$2" class="materialboxed">');
      
      // Остальные базовые преобразования Markdown
      return markdown
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^\* (.*$)/gm, '<li>$1</li>')
          .replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
          .replace(/\n/g, '<br>');
  }

  applySyntaxHighlighting() {
    if (typeof hljs !== 'undefined' && this.previewContainer) {
      // Подсветка блоков кода
      this.previewContainer.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
              if (typeof hljs.lineNumbersBlock === 'function') {
          hljs.lineNumbersBlock(block);
        }
      });
      
      // Инициализация Materialbox для изображений
      if (typeof M !== 'undefined' && M.Materialbox) {
        const images = this.previewContainer.querySelectorAll('.materialboxed');
        M.Materialbox.init(images);
      }
    }
  }

  updatePreview(html) {
    if (!this.previewContainer) return;
    
    this.previewContainer.innerHTML = `
      <div class="markdown-body material-theme">
        ${html || 'Preview will appear here'}
      </div>
    `;
  }

  showError(message) {
    if (!this.previewContainer) return;
    
    this.previewContainer.innerHTML = `
      <div class="preview-error material-theme">
        <i class="mdi mdi-alert-circle"></i>
        <span>${message}</span>
      </div>
    `;
  }
}

const Preview = new MkDocsPreview();