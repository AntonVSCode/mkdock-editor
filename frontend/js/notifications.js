/**
 * Универсальная функция для показа уведомлений
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления (success, error, info)
 * @param {string|null} icon - Класс иконки (например, 'mdi mdi-check')
 * @param {number} duration - Время показа в миллисекундах (по умолчанию 5000 мс)
 */
function showNotification(message, type = 'info', icon = null, duration = 5000) {
  // Создаем контейнер для уведомлений, если его нет
  let container = document.getElementById('notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifications-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  // Устанавливаем иконку по умолчанию в зависимости от типа
  if (!icon) {
    icon = type === 'success' ? 'mdi mdi-check-circle' :
           type === 'error' ? 'mdi mdi-alert-circle' : 'mdi mdi-information';
  }
  
  // Добавляем кнопку закрытия
  notification.innerHTML = `
    <div class="notification-content">
      <i class="${icon}"></i>
      <span>${message}</span>
    </div>
    <button class="notification-close">
      <i class="mdi mdi-close"></i>
    </button>
  `;
  
  container.appendChild(notification);
  
  // Анимация появления
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Функция для скрытия уведомления
  const hideNotification = () => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  };
  
  // Закрытие по таймауту
  let timeoutId = setTimeout(hideNotification, duration);
  
  // Закрытие по клику на кнопку
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(timeoutId);
    hideNotification();
  });
  
  // Закрытие при клике на само уведомление (опционально)
  notification.addEventListener('click', (e) => {
    if (e.target === notification) {
      clearTimeout(timeoutId);
      hideNotification();
    }
  });
}

// /**
//  * Универсальная функция для показа уведомлений
//  * @param {string} message - Текст сообщения
//  * @param {string} type - Тип уведомления (success, error, info)
//  * @param {string|null} icon - Класс иконки (например, 'mdi mdi-check')
//  */
// function showNotification(message, type = 'info', icon = null) {
//   const notification = document.createElement('div');
//   notification.className = `notification ${type}`;
  
//   if (!icon) {
//     icon = type === 'success' ? 'mdi mdi-check-circle' :
//            type === 'error' ? 'mdi mdi-alert-circle' : 'mdi mdi-information';
//   }
  
//   notification.innerHTML = `
//     <i class="${icon}"></i>
//     <span>${message}</span>
//   `;
  
//   document.body.appendChild(notification);
  
//   setTimeout(() => notification.classList.add('show'), 10);
//   setTimeout(() => {
//     notification.classList.remove('show');
//     setTimeout(() => notification.remove(), 300);
//   }, 3000);
// }