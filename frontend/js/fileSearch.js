class FileSearch {
  constructor() {
    this.searchInput = document.getElementById('file-search');
    this.clearButton = document.getElementById('clear-search');
    this.fileTree = document.getElementById('file-tree');
    this.init();
  }

  init() {
    this.searchInput.addEventListener('input', (e) => {
      this.searchFiles(e.target.value.trim());
    });

    this.clearButton.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearch();
    });
  }

  searchFiles(searchTerm) {
    this.clearButton.style.display = searchTerm ? 'block' : 'none';
    const term = searchTerm.toLowerCase();
    let foundAny = false;

    // Сначала скрываем все элементы
    const allItems = this.fileTree.querySelectorAll('.file-item');
    allItems.forEach(item => {
      item.style.display = 'none';
      item.classList.remove('search-match', 'folder-match');
      const pathElement = item.querySelector('.file-path');
      if (pathElement) pathElement.remove();
      
      // Закрываем все вложенные папки
      if (item.classList.contains('folder-item') || item.querySelector('.mdi-folder')) {
        const contents = item.nextElementSibling;
        if (contents?.classList.contains('directory-contents')) {
          contents.style.display = 'none';
          item.classList.remove('expanded');
        }
      }
    });

    if (!searchTerm) {
      this.clearSearch();
      return;
    }

    // Ищем рекурсивно по всему дереву
    const searchRecursive = (container) => {
      const items = container.querySelectorAll('.file-item');
      
      items.forEach(item => {
        const nameElement = item.querySelector('.file-name, span');
        if (!nameElement) return;

        const isFolder = item.classList.contains('folder-item') || 
                        item.querySelector('.mdi-folder') ||
                        item.nextElementSibling?.classList.contains('directory-contents');

        const itemText = nameElement.textContent.toLowerCase();
        const isMatch = itemText.includes(term);
        
        if (isMatch) {
          foundAny = true;
          item.style.display = '';
          item.classList.add(isFolder ? 'folder-match' : 'search-match');
          
          // Раскрываем всю иерархию
          this.expandToShowItem(item);
        }

        // Проверяем вложенные элементы
        if (isFolder && item.nextElementSibling?.classList.contains('directory-contents')) {
          searchRecursive(item.nextElementSibling);
          
          // Показываем папку, если во вложенности есть совпадения
          const hasMatchesInside = item.nextElementSibling.querySelector('.search-match');
          if (hasMatchesInside) {
            item.style.display = '';
            item.classList.add('folder-match', 'expanded');
            item.nextElementSibling.style.display = 'block';
          }
        }
      });
    };

    searchRecursive(this.fileTree);

    if (!foundAny) {
      this.showNoResults();
    } else {
      const noResults = this.fileTree.querySelector('.no-results');
      if (noResults) noResults.remove();
    }
  }

  expandToShowItem(item) {
    let parent = item.parentElement;
    while (parent && parent !== this.fileTree) {
      if (parent.classList.contains('file-item')) {
        parent.style.display = '';
        
        // Раскрываем папки
        const isFolder = parent.classList.contains('folder-item') || 
                        parent.querySelector('.mdi-folder');
        if (isFolder) {
          parent.classList.add('folder-match', 'expanded');
          const contents = parent.nextElementSibling;
          if (contents?.classList.contains('directory-contents')) {
            contents.style.display = 'block';
          }
        }
      }
      parent = parent.parentElement;
    }
  }

  showNoResults() {
    let noResults = this.fileTree.querySelector('.no-results');
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'Ничего не найдено';
      noResults.style.cssText = `
        padding: 10px;
        color: var(--text-muted);
        font-style: italic;
      `;
      this.fileTree.appendChild(noResults);
    }
  }

  clearSearch() {
    const allItems = this.fileTree.querySelectorAll('.file-item');
    allItems.forEach(item => {
      item.style.display = '';
      item.classList.remove('search-match', 'folder-match');
      
      // Удаляем добавленные пути
      const pathElement = item.querySelector('.file-path');
      if (pathElement) pathElement.remove();
      
      // Восстанавливаем состояние папок
      if (item.classList.contains('folder-item') || item.querySelector('.mdi-folder')) {
        const contents = item.nextElementSibling;
        if (contents?.classList.contains('directory-contents')) {
          contents.style.display = item.classList.contains('expanded') ? 'block' : 'none';
        }
      }
    });

    const noResults = this.fileTree.querySelector('.no-results');
    if (noResults) noResults.remove();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.fileSearch = new FileSearch();
});


// class FileSearch {
//   constructor() {
//     this.searchInput = document.getElementById('file-search');
//     this.clearButton = document.getElementById('clear-search');
//     this.fileTree = document.getElementById('file-tree');
//     this.init();
//   }

//   init() {
//     this.searchInput.addEventListener('input', (e) => {
//       this.searchFiles(e.target.value.trim());
//     });

//     this.clearButton.addEventListener('click', () => {
//       this.searchInput.value = '';
//       this.clearSearch();
//     });
//   }

//   searchFiles(searchTerm) {
//     this.clearButton.style.display = searchTerm ? 'block' : 'none';
//     const term = searchTerm.toLowerCase();
//     let foundAny = false;

//     // Сначала скрываем все элементы
//     const allItems = this.fileTree.querySelectorAll('.file-item');
//     allItems.forEach(item => {
//       item.style.display = 'none';
//       item.classList.remove('search-match', 'folder-match');
//       const pathElement = item.querySelector('.file-path');
//       if (pathElement) pathElement.remove();
//     });

//     if (!searchTerm) {
//       this.clearSearch();
//       return;
//     }

//     // Ищем рекурсивно по всему дереву
//     const searchRecursive = (container) => {
//       const items = container.querySelectorAll('.file-item');
      
//       items.forEach(item => {
//         const nameElement = item.querySelector('.file-name, span');
//         if (!nameElement) return;

//         const isFolder = item.classList.contains('folder-item') || 
//                         item.querySelector('.mdi-folder') ||
//                         item.nextElementSibling?.classList.contains('directory-contents');

//         const itemText = nameElement.textContent.toLowerCase();
//         const isMatch = itemText.includes(term);
        
//         if (isMatch) {
//           foundAny = true;
//           item.style.display = '';
//           item.classList.add(isFolder ? 'folder-match' : 'search-match');
          
//           // Раскрываем всю иерархию
//           this.expandToShowItem(item);
//         }

//         // Проверяем вложенные элементы
//         if (isFolder && item.nextElementSibling?.classList.contains('directory-contents')) {
//           searchRecursive(item.nextElementSibling);
          
//           // Показываем папку, если во вложенности есть совпадения
//           const hasMatchesInside = item.nextElementSibling.querySelector('.search-match');
//           if (hasMatchesInside) {
//             item.style.display = '';
//             item.classList.add('folder-match');
//           }
//         }
//       });
//     };

//     searchRecursive(this.fileTree);

//     if (!foundAny) {
//       this.showNoResults();
//     } else {
//       const noResults = this.fileTree.querySelector('.no-results');
//       if (noResults) noResults.remove();
//     }
//   }

//   expandToShowItem(item) {
//     let parent = item.parentElement;
//     while (parent && parent !== this.fileTree) {
//       if (parent.classList.contains('file-item')) {
//         parent.style.display = '';
        
//         // Раскрываем папки
//         const isFolder = parent.classList.contains('folder-item') || 
//                         parent.querySelector('.mdi-folder');
//         if (isFolder) {
//           const contents = parent.nextElementSibling;
//           if (contents?.classList.contains('directory-contents')) {
//             contents.style.display = 'block';
//           }
//         }
//       }
//       parent = parent.parentElement;
//     }
//   }

//   showNoResults() {
//     let noResults = this.fileTree.querySelector('.no-results');
//     if (!noResults) {
//       noResults = document.createElement('div');
//       noResults.className = 'no-results';
//       noResults.textContent = 'Ничего не найдено';
//       noResults.style.cssText = `
//         padding: 10px;
//         color: var(--text-muted);
//         font-style: italic;
//       `;
//       this.fileTree.appendChild(noResults);
//     }
//   }

//   clearSearch() {
//     const allItems = this.fileTree.querySelectorAll('.file-item');
//     allItems.forEach(item => {
//       item.style.display = '';
//       item.classList.remove('search-match', 'folder-match');
      
//       // Удаляем добавленные пути
//       const pathElement = item.querySelector('.file-path');
//       if (pathElement) pathElement.remove();
//     });

//     const noResults = this.fileTree.querySelector('.no-results');
//     if (noResults) noResults.remove();
//   }
// }

// document.addEventListener('DOMContentLoaded', () => {
//   window.fileSearch = new FileSearch();
// });