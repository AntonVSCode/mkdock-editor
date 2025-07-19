// document.addEventListener('DOMContentLoaded', async () => {
//   try {

//     // Проверяем компоненты
//     if (typeof FileExplorer === 'undefined' || typeof Editor === 'undefined') {
//       throw new Error('Required components are not loaded');
//     }

//     // Инициализация модулей
//     await Promise.all([
//       Editor.init(),
//       FileExplorer.init(),
//       Preview.init(),
//       typeof MaterialShortcuts !== 'undefined' && MaterialShortcuts.init(),
//       // Инициализация редактора настроек
//       //typeof SettingsEditor !== 'undefined' && new SettingsEditor()
//       typeof SettingsEditor !== 'undefined' && document.querySelector('.explorer-footer a') && new SettingsEditor()
//     ]);
//     // Проверка поддержки API
//     if (!window.Promise || !window.fetch) {
//       throw new Error('Browser not supported');
//     }

//     // Проверка наличия необходимых компонентов перед инициализацией
//     if (typeof FileExplorer === 'undefined' || typeof Editor === 'undefined' || typeof Preview === 'undefined') {
//       throw new Error('Required components are not loaded');
//     }

//     // Инициализация модулей с проверкой их доступности
//     await Promise.all([
//       typeof Editor.init === 'function' ? Editor.init() : Promise.resolve(),
//       typeof FileExplorer.init === 'function' ? FileExplorer.init() : Promise.resolve(),
//       typeof Preview.init === 'function' ? Preview.init() : Promise.resolve(),
//       typeof MaterialShortcuts === 'object' && typeof MaterialShortcuts.init === 'function' ? 
//         MaterialShortcuts.init() : Promise.resolve(),
//     ]);

//     // Обработчики для кнопок файлового менеджера
//     document.getElementById('new-folder')?.addEventListener('click', async (e) => {
//       console.log('New folder button clicked directly');
//       await FileExplorer.createNewDirectory();
//     });

//     // Инициализация просмотрщика изображений
//     if (window.imageViewer && typeof window.imageViewer.init === 'function') {
//       await window.imageViewer.init();
//     }

//     // Настройка обработчиков
//     document.getElementById('refresh-preview')?.addEventListener('click', () => {
//       if (typeof Editor.getContent === 'function' && typeof Preview.refresh === 'function') {
//         Preview.refresh(Editor.getContent());
//       }
//     });

//     // Первоначальная загрузка
//     if (typeof FileExplorer.loadFiles === 'function') {
//       await FileExplorer.loadFiles();
//     }
    
//     if (typeof Preview.refresh === 'function') {
//       Preview.refresh('# Welcome to MkDocs Editor');
//     }

//   } catch (error) {
//     console.error('Initialization error:', error);
//     // Fallback для превью
//     const previewContainer = document.getElementById('preview-content');
//     if (previewContainer) {
//       previewContainer.innerHTML = `
//         <div class="preview-error">
//           <i class="mdi mdi-alert-circle"></i>
//           <span>Initialization Error: ${error.message}</span>
//         </div>
//       `;
//     }
//   }
// });

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Проверка поддержки API
    if (!window.Promise || !window.fetch) {
      throw new Error('Browser not supported');
    }

    // Проверка наличия необходимых компонентов перед инициализацией
    const requiredComponents = {
      FileExplorer: FileExplorer?.init,
      Editor: Editor?.init,
      Preview: Preview?.init
    };

    for (const [name, initFn] of Object.entries(requiredComponents)) {
      if (!initFn) {
        throw new Error(`Required component ${name} is not loaded`);
      }
    }

    // Инициализация модулей
    await Promise.all([
      Editor.init(),
      FileExplorer.init(),
      Preview.init(),
      typeof MaterialShortcuts !== 'undefined' && MaterialShortcuts.init(),
      typeof SettingsEditor !== 'undefined' && document.querySelector('.explorer-footer a') && new SettingsEditor(),
      typeof window.imageViewer !== 'undefined' && window.imageViewer.init()
    ]);

    // Обработчики для кнопок файлового менеджера
    document.getElementById('new-folder')?.addEventListener('click', async () => {
      await FileExplorer.createNewDirectory();
    });

    // Первоначальная загрузка
    await FileExplorer.loadFiles();
    Preview.refresh('# Welcome to MkDocs Editor');

  } catch (error) {
    console.error('Initialization error:', error);
    const previewContainer = document.getElementById('preview-content');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="preview-error">
          <i class="mdi mdi-alert-circle"></i>
          <span>Initialization Error: ${error.message}</span>
        </div>
      `;
    }
    showNotification(`Ошибка инициализации: ${error.message}`, 'error');
  }
});

// Обработчик для кнопки превью
document.getElementById('toggle-preview')?.addEventListener('click', function() {
    const preview = document.getElementById('preview-container');
    if (!preview) return;

    preview.classList.toggle("hidden");

    // Обновляем размеры редактора при переключении
    if (typeof Editor !== 'undefined' && Editor.codemirror) {
        Editor.codemirror.refresh();
    }

    // Обновляем содержимое превью если оно становится видимым
    if (!preview.classList.contains("hidden")) {
        if (typeof Preview.refresh === 'function' && typeof Editor.getContent === 'function') {
            Preview.refresh(Editor.getContent());
        }
    }
});

