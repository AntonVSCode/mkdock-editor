---
tags:
  - curl
  - linux
---

Основные ключи (опции) curl, которые полезны в повседневной работе:

## Основные ключи для HTTP-запросов

### **Методы запросов**
```bash
-X GET/POST/PUT/DELETE    # Указать HTTP-метод
```

### **Заголовки**
```bash
-H "Header: Value"        # Добавить заголовок
-H "Content-Type: application/json"
-H "Authorization: Bearer token"
```

### **Данные запроса**
```bash
-d "data"                 # Отправить данные (POST)
-d '{"key":"value"}'      # JSON данные
-F "file=@filename"       # Загрузка файла
```

## Ключи для отладки и информации

### **Вывод заголовков**
```bash
-I, --head               # Только заголовки ответа (как в вашем примере)
-i, --include            # Заголовки + тело ответа
-v, --verbose            # Подробный вывод (все детали запроса)
```

### **Примеры:**
```bash
curl -I https://api.example.com      # Только HTTP-заголовки
curl -i https://api.example.com      # Заголовки + тело
curl -v https://api.example.com      # Максимальная детализация
```

## Безопасность и SSL

### **SSL/TLS настройки**
```bash
-k, --insecure           # Игнорировать проверку SSL-сертификатов
--cacert file.pem        # Указать CA-сертификат
--cert client.pem        # Клиентский сертификат
--key key.pem            # Приватный ключ
```

## Работа с файлами

### **Скачивание/загрузка**
```bash
-o filename              # Сохранить вывод в файл
-O                       # Сохранить с оригинальным именем
-L, --location           # Следовать редиректам
-C -                     # Продолжить прерванную загрузку
```

### **Примеры:**
```bash
curl -O https://example.com/file.zip    # Скачать с исходным именем
curl -o myfile.zip https://example.com/file.zip  # Сохранить как myfile.zip
```

## Аутентификация

### **Базовые методы**
```bash
-u user:password         # Базовая аутентификация
-u user                  # Запрос пароля интерактивно
```

## Полезные комбинации

### **Для API-тестирования:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"key":"value"}' \
  https://api.example.com/endpoint
```

### **Для отладки:**
```bash
curl -v -I -L https://example.com  # Подробно + заголовки + редиректы
```

### **Для скачивания:**
```bash
curl -L -O -C - https://example.com/large-file.zip  # С редиректами и продолжением
```

## Практические примеры из вашего случая

```bash
# Проверить доступность эндпоинта
curl -I https://rancher.logrocon.com/cacerts

# Скачать скрипт с игнорированием SSL ошибок
curl -k -fL https://rancher.logrocon.com/system-agent-install.sh

# Тестирование API с токеном
curl -H "Authorization: Bearer ваш_токен" https://api.example.com
```

Ключ `-I`, который вы использовали, очень полезен для быстрой проверки:
- Доступности сервера
- Кодов ответа HTTP
- Заголовков без загрузки всего тела
