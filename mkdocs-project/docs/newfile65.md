---
---

# New File

Start editing here...

фацафаыфафывф

# 123
**bold**

```bash
# Marked.js (для преобразования Markdown в HTML)
wget https://cdn.jsdelivr.net/npm/marked/marked.min.js -O frontend/assets/vendor/marked.min.js

# Highlight.js (подсветка синтаксиса)
wget https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js -O frontend/assets/vendor/highlight.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/base16/material-darker.min.css -O frontend/assets/vendor/highlight-dark.css

# Нумерация строк
wget https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js -O frontend/assets/vendor/highlight-line-numbers.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.css -O frontend/assets/vendor/highlight-line-numbers.css

# Material Design Icons (если нужны)
wget https://cdn.jsdelivr.net/npm/@mdi/font@6.5.95/css/materialdesignicons.min.css -O frontend/assets/vendor/material-icons.css

<!-- Замените CDN-ссылки на локальные -->
<link rel="stylesheet" href="assets/vendor/material-icons.css">
<link rel="stylesheet" href="assets/vendor/highlight-dark.css">
<link rel="stylesheet" href="assets/vendor/highlight-line-numbers.css">
<script src="assets/vendor/marked.min.js"></script>
<script src="assets/vendor/highlight.min.js"></script>
<script src="assets/vendor/highlight-line-numbers.min.js"></script>
```

```{ .javascript .select }
// Удаляем предыдущий экземпляр (если есть)
  if (this.cmInstance) {
    container.removeChild(container.querySelector('.CodeMirror'));
  }

  this.cmInstance = CodeMirror(container, {
    value: textarea.value || '',
    mode: {
      name: "markdown",
      highlightFormatting: true, // Подсветка синтаксиса Markdown
      htmlMode: true            // Для корректного автозакрытия HTML-тегов
    },
    theme: "material",
    lineNumbers: true,
    lineWrapping: true,
    autoCloseTags: true,        // Автозакрытие HTML-тегов (например, `<div>` → `</div>`)
    autoCloseBrackets: true,    // Автозакрытие скобок и кавычек
    indentUnit: 4,
    extraKeys: {
      "Ctrl-Space": "autocomplete",
      "F5": () => Preview.refresh(this.getContent())
    }
  });
```

```javascript
// Удаляем предыдущий экземпляр (если есть)
  if (this.cmInstance) {
    container.removeChild(container.querySelector('.CodeMirror'));
  }

  this.cmInstance = CodeMirror(container, {
    value: textarea.value || '',
    mode: {
      name: "markdown",
      highlightFormatting: true, // Подсветка синтаксиса Markdown
      htmlMode: true            // Для корректного автозакрытия HTML-тегов
    },
    theme: "material",
    lineNumbers: true,
    lineWrapping: true,
    autoCloseTags: true,        // Автозакрытие HTML-тегов (например, `<div>` → `</div>`)
    autoCloseBrackets: true,    // Автозакрытие скобок и кавычек
    indentUnit: 4,
    extraKeys: {
      "Ctrl-Space": "autocomplete",
      "F5": () => Preview.refresh(this.getContent())
    }
  });
```
!!! note "Note Title"

    Your note content here
![2 Games in One! - Marble Madness + Klax (U) [!]-screenshot.png](../images/a1ea1b8b-130f-4142-b255-fe12a2d90b7f.png)

\\    
    
??? note\n\n    
