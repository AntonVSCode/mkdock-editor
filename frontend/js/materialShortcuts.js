const MaterialShortcuts = {

  init: function() {
    // Обработчики для кнопок
    document.getElementById('note-btn')?.addEventListener('click', () => {
      this.insertTemplate('!!! note');
    });
    
    document.getElementById('foldable-btn')?.addEventListener('click', () => {
      this.insertTemplate('??? note');
    });
    
    // Обработчик для загрузки изображений
    document.getElementById('image-upload-btn')?.addEventListener('click', () => {
      this.handleImageUpload();
    });
  },
  
  insertTemplate: function(template) {
    let text = '';
    
    if (template === '!!! note') {
      text = `!!! note "Note Title"\n\n    Your note content here\n`;
    } else if (template === '??? note') {
      text = `??? note "Foldable Title"\n\n    Your foldable content here\n`;
    }
    
    if (typeof Editor !== 'undefined' && Editor.insertAtCursor) {
      Editor.insertAtCursor(text);
      
      // Если нужно переместить курсор внутрь блока
      if (Editor.cmInstance) {
        const doc = Editor.cmInstance.getDoc();
        const cursor = doc.getCursor();
        doc.setCursor({ line: cursor.line - 1, ch: 4 }); // Пример позиционирования
      }
    }
  },

  handleImageUpload: function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/editor/api/upload', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(error.message || 'Upload failed');
        }
        
        const result = await response.json();
        
        if (typeof Editor !== 'undefined' && Editor.insertAtCursor) {
          Editor.insertAtCursor(result.markdown);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Ошибка загрузки: ${error.message}`);
      }
    };
    
    input.click();
  }
};
