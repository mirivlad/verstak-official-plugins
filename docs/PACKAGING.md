# Plugin Packaging

Описание сборки и упаковки плагинов для дистрибуции.

## Source Plugin Layout

Исходная структура плагина в монорепо `verstak-official-plugins`:

```
plugin-name/
  plugin.json           — обязательный manifest
  frontend/
    package.json        — опционально, npm проект (Svelte/Vite)
    src/
      index.js          — source entry point для plain JS plugins
      ...
    dist/               — ignored build output для npm frontend plugins
      index.js
      style.css
  backend/              — опционально (Go sidecar)
    go.mod
    main.go
  migrations/           — опционально
    001_init.sql
  assets/               — опционально
  README.md
```

## Dist Plugin Package Layout

Результат сборки (`dist/<plugin-name>/`) — это минимальный пакет для установки:

```
dist/
  plugin-name/
    plugin.json           — manifest для runtime package
    frontend/
      dist/               — только собранные файлы (копируется содержимое)
        index.js
        style.css
    backend/
      plugin-name         — скомпилированный бинарник (копируется из backend/)
```

## Что попадает в dist

### plugin.json

Исходный `plugin.json` копируется в package. Если plain JS plugin в исходниках
указывает `frontend.entry` на `frontend/src/index.js`, `build.sh` переписывает
это поле в packaged manifest на `frontend/dist/index.js`.

Содержит:

| Поле | Назначение в dist |
|---|---|
| `id`, `name`, `version`, `apiVersion`, `schemaVersion` | Идентификация |
| `provides` | Capabilities плагина |
| `requires`, `optionalRequires` | Зависимости от capabilities |
| `permissions` | Запрашиваемые разрешения |
| `frontend.entry` | Путь к frontend entry (относительно корня плагина) |
| `contributes` | UI contributions |

### frontend/dist

Для plugins с `frontend/package.json` содержимое `frontend/dist/` копируется в
`dist/<plugin-name>/frontend/dist/`. Это результат `npm run build` —
скомпилированные JS/CSS без map-файлов и dev-зависимостей.

Для plain JS plugins без `frontend/package.json` `build.sh` всегда копирует
tracked `frontend/src/index.js` в `dist/<plugin-name>/frontend/dist/index.js`.
Ignored source-side `frontend/dist/` не используется для таких plugins, чтобы
локальные stale build artifacts не попадали в package.

### backend binary

Если в исходном плагине есть `backend/` с `go.mod` или `main.go`, собирается через:

```bash
cd backend && go build -o <plugin-name> .
```

Бинарник копируется в `dist/<plugin-name>/backend/<plugin-name>` с правами `+x`.

## Что НЕ попадает в dist

| Исключение | Причина |
|---|---|
| `node_modules/` | Dev dependency, не нужны в runtime |
| `.git/` | Git metadata |
| Go source files (`*.go`, `go.mod`, `go.sum`) | Исходный код backend, не нужен после компиляции |
| Frontend source (`src/`, `package.json`, `package-lock.json`) | Исходный код frontend, нужен только dist/ |
| Test files (`*_test.go`, `*.test.js`) | Тесты |
| Test cache (`testdata/`, `coverage/`) | Артефакты тестирования |
| IDE configs (`.vscode/`, `.idea/`) | Настройки разработчика |

## Сборка

### Полная сборка всех плагинов

```bash
cd ~/git/verstak2/verstak-official-plugins
./scripts/build.sh
```

`build.sh` для каждого плагина в `plugins/`:

1. Проверяет `plugin.json` (JSON validation).
2. Собирает frontend для plugins с `frontend/package.json`: `npm install && npm run build`.
3. Собирает backend: `go build -o <plugin-name> .`.
4. Упаковывает в `dist/<plugin-name>/` через `package_plugin()`. Plain JS
   frontend берётся из `frontend/src/index.js`, packaged manifest получает
   `frontend.entry = "frontend/dist/index.js"`.

### Сборка конкретного плагина

```bash
cd ~/git/verstak2/verstak-official-plugins
./scripts/build.sh
```

`build.sh` intentionally packages all official plugins because packaging includes
manifest rewriting for plain JS plugins. Do not hand-copy `plugin.json` for a
plain JS plugin without applying the same `frontend.entry` rewrite.

### Backend build details

```bash
cd backend
go mod download  # загрузить зависимости
go build -o <plugin-name> .  # скомпилировать бинарник
```

Имя бинарника совпадает с именем директории плагина (например, `platform-test`).

Бинарник должен быть самодостаточным: все зависимости статически линкуются (CGO_ENABLED=0 для кросс-платформенности при необходимости).

## Установка в dev-среде

```bash
cd ~/git/verstak2/verstak-desktop
./scripts/install-dev-plugins.sh
```

Скрипт:

1. Находит `verstak-official-plugins` как sibling-репозиторий (`../verstak-official-plugins`).
2. Если `dist/platform-test/` отсутствует — запускает `build.sh`.
3. Копирует `dist/platform-test/` в `./plugins/platform-test/` (atomic через temp dir).
4. Проверяет наличие `plugin.json`.

Директория `./plugins/` в `verstak-desktop` не коммитится (`.gitignore`).

## Установка пользователем

Пользовательские плагины размещаются в `~/.config/verstak/plugins/<plugin-name>/` с той же структурой, что и dist-пакет:

```
~/.config/verstak/plugins/
  some-plugin/
    plugin.json
    frontend/dist/
    backend/
```

Plugin discovery сканирует эту директорию автоматически.
