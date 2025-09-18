---
tags:
  - fetch
  - mikrotik
---

### Ключевые параметры команды /tool fetch:

| Параметр | Описание | Пример |
| :--- | :--- | :--- |
| **`url`** | Адрес для скачивания/загрузки | `url="https://example.com"` |
| **`src-path`** | Локальный файл для отправки (upload) | `src-path=backup.rsc` |
| **`dst-path`** | Куда сохранить файл (download) | `dst-path=flash/update.bin` |
| **`upload`** | Режим загрузки на сервер | `upload=yes` |
| **`http-method`** | HTTP-метод (get, post, put) | `http-method=post` |
| **`http-data`** | Данные для отправки POST/PUT | `http-data="login=admin"` |
| **`http-header-field`** | Произвольные заголовки HTTP | `http-header-field="Authorization: Bearer token"` |
| **`mode`** | Протокол (http, ftp, https) | `mode=ftp` |
| **`port`** | Порт соединения | `port=2121` |
| **`user`**/**`password`** | Данные аутентификации | `user=admin password=123` |
| **`ssl`** | Использовать SSL-шифрование | `ssl=yes` (для HTTPS) |
| **`check-certificate`** | Проверка SSL-сертификата | `check-certificate=no` |