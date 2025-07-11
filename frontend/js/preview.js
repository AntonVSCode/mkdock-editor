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
    if (this.markedLoaded || typeof marked !== 'undefined') {
      this.markedLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
      script.onload = () => {
        this.markedLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load marked.js'));
      };
      document.head.appendChild(script);
    });
  }

  async loadHighlightJs() {
    if (this.highlightJsLoaded || typeof hljs !== 'undefined') {
      this.highlightJsLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/styles/default.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/highlight.min.js';
      script.onload = () => {
        this.highlightJsLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load highlight.js'));
      };
      document.head.appendChild(script);
    });
  }

  async refresh(content = null) {
    if (!this.isPreviewVisible) return;

    try {
      if (content) this.currentContent = content;
      await this.loadDependencies();
      
      const processed = this.processContent(this.currentContent);
      const html = marked.parse(processed);
      this.updatePreview(html);
      this.applySyntaxHighlighting();
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

  togglePreview() {
    const previewContainer = document.getElementById('preview-container');
    const editorContainer = document.querySelector('.editor-container');
    const toggleBtn = document.getElementById('toggle-preview');
    
    if (!previewContainer || !editorContainer || !toggleBtn) return;
    
    this.isPreviewVisible = !this.isPreviewVisible;
    
    if (this.isPreviewVisible) {
      previewContainer.classList.remove('hidden');
      editorContainer.classList.remove('full-width');
      toggleBtn.querySelector('.btn-text').textContent = 'Hide Preview';
      this.refresh();
    } else {
      previewContainer.classList.add('hidden');
      editorContainer.classList.add('full-width');
      toggleBtn.querySelector('.btn-text').textContent = 'Show Preview';
    }
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
// class MkDocsPreview {
//   constructor() {
//     this.previewContainer = document.getElementById('preview-content');
//     this.currentContent = '';
//     this.markedLoaded = false;
//     this.isPreviewVisible = true; // Добавляем состояние видимости превью
//   }

//   init() {
//     if (!this.previewContainer) {
//       console.error('Preview container not found');
//       return;
//     }
//     this.loadMarked();
//   }

//   async loadMarked() {
//     if (this.markedLoaded || typeof marked !== 'undefined') {
//       this.markedLoaded = true;
//       return Promise.resolve();
//     }

//     return new Promise((resolve, reject) => {
//       const script = document.createElement('script');
//       script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
//       script.onload = () => {
//         this.markedLoaded = true;
//         resolve();
//       };
//       script.onerror = () => {
//         console.error('Failed to load marked.js');
//         reject(new Error('Failed to load marked.js'));
//       };
//       document.head.appendChild(script);
//     });
//   }

//   async refresh(content = null) {
//     if (!this.isPreviewVisible) return;

//     try {
//       if (content) this.currentContent = content;
//       await this.loadMarked();
      
//       const processed = this.processContent(this.currentContent);
//       const html = marked.parse(processed);
//       this.updatePreview(html);
//       this.handleSyntaxHighlighting();
//     } catch (error) {
//       console.error('Preview error:', error);
//       this.showError('Failed to render preview');
//     }
//   }

//   handleSyntaxHighlighting() {
//     if (typeof hljs !== 'undefined' && this.previewContainer) {
//       this.previewContainer.querySelectorAll('pre code').forEach((block) => {
//         hljs.highlightElement(block);
//       });
//     }
//   }

//   processContent(markdown) {
//     return markdown
//       .replace(/^!!! (\w+)(?:\s+"(.+)")?/gm, '<div class="admonition $1">\n<p class="admonition-title">$2</p>')
//       .replace(/^\?\?\? (\w+)(?:\s+"(.+)")?/gm, '<details class="admonition $1">\n<summary>$2</summary>')
//       .replace(/^=== "(.+)"$/gm, '<div class="tab">\n<h3>$1</h3>')
//       .replace(/^\s*$/gm, (m, offset, str) => {
//         const prevLine = str.substring(0, offset).split('\n').pop();
//         return prevLine?.startsWith('<div class="admonition') ? '</div>' : 
//                prevLine?.startsWith('<details') ? '</details>' :
//                prevLine?.startsWith('<div class="tab"') ? '</div>' : m;
//       });
//   }

//   updatePreview(html) {
//     if (!this.previewContainer) return;
    
//     this.previewContainer.innerHTML = `
//       <div class="markdown-body">
//         ${html || 'Preview will appear here'}
//       </div>
//     `;
//   }

//   togglePreview() {
//     const previewContainer = document.getElementById('preview-container');
//     const editorContainer = document.querySelector('.editor-container');
//     const toggleBtn = document.getElementById('toggle-preview');
    
//     if (!previewContainer || !editorContainer || !toggleBtn) return;
    
//     this.isPreviewVisible = !this.isPreviewVisible;
    
//     if (this.isPreviewVisible) {
//       previewContainer.classList.remove('hidden');
//       editorContainer.classList.remove('full-width');
//       toggleBtn.querySelector('.btn-text').textContent = 'Hide Preview';
//       this.refresh();
//     } else {
//       previewContainer.classList.add('hidden');
//       editorContainer.classList.add('full-width');
//       toggleBtn.querySelector('.btn-text').textContent = 'Show Preview';
//     }
//   }

//   showError(message) {
//     if (!this.previewContainer) return;
    
//     this.previewContainer.innerHTML = `
//       <div class="preview-error">
//         <i class="mdi mdi-alert-circle"></i>
//         <span>${message}</span>
//       </div>
//     `;
//   }
// }

// const Preview = new MkDocsPreview();

