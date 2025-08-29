---
tags:
  - instruction
---

# Добро пожаловать в MkDocs, с моими редактором

Полную документацию можно найти здесь [mkdocs.org](https://mkdocs.org).

## Команды запуска сервера

- `mkdocs new [dir-name]` - Создать новый проект
- `mkdocs serve` - Запустить сервер документации с live-reloading
- `mkdocs build` - Собрать сайт документации
- `mkdocs help` - Показать это справочное сообщение
- `mkdocs serve --clean` - Полностью очищает кеш и временные файлы, `--clean` удаляет директорию **site**
- `mkdocs serve -a 0.0.0.0:8000` - Базовый запуск сервера, Только базовые логи (успешная сборка, ошибки)
- `mkdocs serve -a 0.0.0.0:8000 --verbose` - подробный вывод логов

## Базовый макет проекта

    mkdocs.yml    # The configuration file.
    docs/
        index.md  # The documentation homepage.
        ...       # Other markdown pages, images and other files.
