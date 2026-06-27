# AGENTS.md — Verstak Official Plugins

## Назначение

Монорепозиторий официальных плагинов Верстака. Каждый плагин — полноценный динамический плагин, проходящий тот же lifecycle, что и сторонние.

## Состав

```
verstak-official-plugins/
  AGENTS.md
  plugins/
    platform-test/      — тестовый плагин для проверки runtime
    files/
    notes/
    markdown-editor/
    file-preview/
    activity/
    journal/
    browser-inbox/
    search/
    secrets/
    templates/
  packages/
    shared-ui/
    test-harness/
    plugin-sdk/         — временно, пока SDK не выделен
  package.json
  tsconfig.json
```

## Правила для всех плагинов

1. Каждый плагин имеет plugin.json с полным manifest.
2. Плагины зависят от capabilities, а не от plugin ID.
3. Нет скрытого privileged path для official плагинов.
4. disable не удаляет пользовательские данные.
5. Отсутствие optional capability — degraded mode, не ошибка.
6. Plugin Manager показывает статус каждого плагина.

## Первый минимальный набор

- `platform-test` — для отладки runtime
- `official.files` — файловый менеджер
- `official.notes` — заметки
- `official.markdown-editor` — редактор
- `official.file-preview` — предпросмотр изображений/metadata
- `official.activity` — активность
- `official.browser-inbox` — браузерный inbox

Все они должны быть настоящими динамическими плагинами, даже если поставляются вместе с приложением.

## Структура плагина

```
plugin-id/
  plugin.json           — обязательный manifest
  frontend/
    index.js            — entry point
    style.css
  backend/              — опционально
    plugin-linux-amd64
    plugin-windows-amd64.exe
  migrations/           — опционально
    001_init.sql
  assets/
  README.md
```
