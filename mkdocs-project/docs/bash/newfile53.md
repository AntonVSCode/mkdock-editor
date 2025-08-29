# New File

Start editing here...

=== "Вкладка 1"

    ```{ .javascript linenums="1"}
    insertAtCursor: function(text, positionAfterIndent = false) {
      if (this.cmInstance) {
        const doc = this.cmInstance.getDoc();
        const cursor = doc.getCursor();
        const lines = text.split(&#039;\n&#039;);

        doc.replaceRange(text, cursor);

        if (positionAfterIndent) {
          const contentLine = lines.findIndex(line =&gt; line.startsWith(&#039;    &#039;));
          if (contentLine &gt; -1) {
            doc.setCursor({
              line: cursor.line + contentLine,
              ch: 4
            });
          }
        }
        this.cmInstance.focus();
      } else if (this.editor) {
        const startPos = this.editor.selectionStart;
        const endPos = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, startPos) + 
                          text + 
                          this.editor.value.substring(endPos);
        this.editor.focus();
      }
    },
    ```
    Добавляем оставшийся текст после последнего блока кода

=== "Вкладка 2"

    ```{ .javascript linenums="1"}
    escapeHtml: function(unsafe) {
      return unsafe
        .replace(/&amp;/g, &quot;&amp;amp;&quot;)
        .replace(/&lt;/g, &quot;&amp;lt;&quot;)
        .replace(/&gt;/g, &quot;&amp;gt;&quot;)
        .replace(/&quot;/g, &quot;&amp;quot;&quot;)
        .replace(/&#039;/g, &quot;&amp;#039;&quot;);
    },
    ```
    Заменяем относительные пути на абсолютные для предпросмотра
    

 Вставка текста в текущую позицию курсора   
