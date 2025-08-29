---
tags:
  - vscode
---

# Настрока vscode на сервере ubuntu

Установите владельца папки (www-data)
```bash
sudo chown -R www-data:www-data /путь/к/папке
```
**Дайте права на чтение и запись для владельца (www-data)**
755 — владелец (www-data) имеет полные права (7 = rwx), группа и остальные — только чтение и выполнение (5 = r-x).
```bash
sudo chmod -R 755 /путь/к/папке
```
Добавьте пользователя **azubarev** в группу **www-data**
```bash
sudo usermod -aG www-data azubarev
```
Перезагрузите сессию пользователя azubarev
```bash
su - azubarev
```
Проверьте права
```bash
ls -la /путь/к/папке
# Должно отображаться примерно так
drwxrwxr-x  www-data www-data  ...
```
Если VS Code всё ещё не может редактировать файлы
**Перезапустить VS Code**