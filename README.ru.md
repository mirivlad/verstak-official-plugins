<div align="center">

# Официальные плагины Верстака

### Базовый набор плагинов — Файлы, Заметки, Редактор, Активность, Журнал и другие.

[English](README.md) · **Русский**

[![Релиз](https://img.shields.io/github/v/release/mirivlad/verstak-official-plugins?include_prereleases\&label=release)](https://github.com/mirivlad/verstak-official-plugins/releases)
![Статус](https://img.shields.io/badge/status-alpha-orange)
[![Лицензия](https://img.shields.io/github/license/mirivlad/verstak-official-plugins)](LICENSE)

</div>

> **Alpha-версия.** Собирайте этот репозиторий вместе с совместимыми
> версиями `verstak-desktop` и `verstak-sdk`.

Официальные плагины — базовый набор инструментов Верстака: Файлы, Корзина,
Заметки, Редактор, Предпросмотр, Входящие из браузера, Активность, Журнал,
Задачи, Поиск, Секреты, Синхронизация, Импорт и Шаблоны. Плагины собираются в
независимые пакеты, которые desktop-приложение загружает из папки `plugins/`.

## Состав

| Плагин | Назначение |
|--------|------------|
| `verstak.files` | Файловый менеджер внутри дела |
| `verstak.trash` | Корзина: восстановление и удаление |
| `verstak.notes` | Заметки в формате Markdown |
| `verstak.default-editor` | Редактор текста и Markdown |
| `verstak.file-preview` | Предпросмотр изображений |
| `verstak.activity` | История активности и реконструкция работы |
| `verstak.journal` | Журнал работ |
| `verstak.browser-inbox` | Приём материалов из браузера |
| `verstak.search` | Поиск по файлам и заметкам |
| `verstak.secrets` | Защищённое хранилище доступов |
| `verstak.todo` | Списки задач |
| `verstak.sync` | Синхронизация между устройствами |
| `verstak.import` | Проверяемый импорт актуальных данных DokuWiki и Obsidian |
| `verstak.templates` | Шаблоны дел |

Все плагины используют один и тот же runtime, что и сторонние.

## Сборка

Требования: Node.js с npm, Go и Python 3. Репозиторий должен находиться рядом
с `verstak-sdk`, чтобы проверка manifest использовала SDK-схему.

```bash
npm --version
go version
./scripts/check.sh
./scripts/build.sh
```

Сборка создаёт пакеты в `dist/<plugin-id>/`. Чтобы установить их в соседний
desktop-репозиторий:

```bash
cd ../verstak-desktop
./scripts/install-dev-plugins.sh
```

## Портативные архивы плагинов

Сборка архивов под конкретную платформу (Linux):

```bash
sudo apt install gcc-mingw-w64-x86-64
./scripts/package-portable.sh v0.1.0-alpha.1
```

Команда создаёт `release/verstak-official-plugins-linux-amd64-<version>.tar.gz`
и `release/verstak-official-plugins-windows-amd64-<version>.zip`, а также
`SHA256SUMS`. Каждый архив распаковывается прямо в `plugins/` desktop-приложения.
Frontend и manifest общие; нативные Go sidecar собираются под целевую ОС.
Это локальная операция упаковки, она не создаёт GitHub Release.

## Публикация GitHub Release

```bash
./scripts/publish-github-release.sh v0.1.0-alpha.1
```

Требуется авторизованный [`gh`](https://cli.github.com/) CLI и чистый
актуальный `main`. Создаёт и отправляет аннотированный тег, затем создаёт
или обновляет GitHub Release с Linux-архивом, Windows-архивом и `SHA256SUMS`.

## Лицензия

Copyright © 2026 Verstak contributors. Распространяется на условиях
[GNU AGPLv3 или новее](LICENSE).
