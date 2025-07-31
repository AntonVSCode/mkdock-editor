document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Проверка поддержки браузером необходимых API
    if (!window.Promise || !window.fetch) {
      throw new Error('Ваш браузер не поддерживается. Требуется современный браузер.');
    }

    // 2. Проверка загрузки CodeMirror
    if (!window.CodeMirror) {
      throw new Error('CodeMirror не загружен. Проверьте подключение скриптов.');
    }

    // 3. Проверка наличия основных компонентов
    const requiredComponents = {
      FileExplorer: FileExplorer?.init,
      Editor: Editor?.init,
      Preview: Preview?.init
    };

    for (const [name, initFn] of Object.entries(requiredComponents)) {
      if (!initFn) {
        throw new Error(`Не удалось загрузить необходимый компонент: ${name}`);
      }
    }

    // 4. Инициализация редактора (первым, так как другие модули зависят от него)
    await Editor.init();

    // 5. Инициализация MaterialShortcuts (если загружен)
    if (typeof MaterialShortcuts !== 'undefined') {
      MaterialShortcuts.init(Editor);
      MaterialShortcuts.setupButtons();
      
      // Устанавливаем горячие клавиши после полной инициализации
      if (Editor.cmInstance) {
        MaterialShortcuts.registerHotkeys();
      }
    }

    // 6. Инициализация остальных компонентов
    await Promise.all([
      FileExplorer.init(),
      Preview.init(),
      typeof window.imageViewer !== 'undefined' && window.imageViewer.init()
    ]);

    // 7. Установка обработчиков событий

    // Обработчик для создания новой папки
    document.getElementById('new-folder')?.addEventListener('click', async () => {
      await FileExplorer.createNewDirectory();
    });

    // Обработчик для открытия настроек конфига
    document.getElementById('open-mkdocs-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof SettingsEditor !== 'undefined') {
        new SettingsEditor();
      } else {
        console.warn('SettingsEditor не загружен');
      }
    });

    // Обработчик для обновления превью
    document.getElementById('refresh-preview')?.addEventListener('click', () => {
      if (typeof Editor.getContent === 'function' && typeof Preview.refresh === 'function') {
        Preview.refresh(Editor.getContent());
      }
    });

    // Обработчик для переключения превью
    document.getElementById('toggle-preview')?.addEventListener('click', function() {
      const preview = document.getElementById('preview-container');
      if (!preview) return;

      preview.classList.toggle("hidden");

      // Обновляем размеры редактора
      if (typeof Editor !== 'undefined' && Editor.codemirror) {
          Editor.codemirror.refresh();
      }

      // Обновляем содержимое превью если оно становится видимым
      if (!preview.classList.contains("hidden") && typeof Preview.refresh === 'function') {
          Preview.refresh(Editor.getContent());
      }
    });

    // 8. Первоначальная загрузка файлов и установка приветственного сообщения
    await FileExplorer.loadFiles();
    Preview.refresh('# Welcome to MkDocs Editor');

  } catch (error) {
    console.error('Ошибка инициализации:', error);
    
    // Показываем понятное сообщение об ошибке пользователю
    const previewContainer = document.getElementById('preview-content');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="error-alert">
          <i class="mdi mdi-alert-circle"></i>
          <h3>Ошибка загрузки редактора</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()" class="reload-btn">
            <i class="mdi mdi-refresh"></i> Перезагрузить
          </button>
        </div>
      `;
    }
    
    // Показываем уведомление
    if (typeof showNotification === 'function') {
      showNotification(`Ошибка инициализации: ${error.message}`, 'error');
    }
  }
});
