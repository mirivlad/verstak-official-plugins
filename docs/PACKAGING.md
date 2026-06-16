# Plugin Packaging

Описание сборки и упаковки плагинов для дистрибуции.

## Source Plugin Layout

Исходная структура плагина в монорепо `verstak-official-plugins`:

```
plugin-name/
  plugin.json           — обязательный manifest
  frontend/
    package.json        — npm проект (Svelte)
    src/
      index.js          — entry point
      ...
    dist/               — сборка frontend (npm run build)
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
    plugin.json           — копируется из корня исходного плагина
    frontend/
      dist/               — только собранные файлы (копируется содержимое)
        index.js
        style.css
    backend/
      plugin-name         — скомпилированный бинарник (копируется из backend/)
```

## Что попадает в dist

### plugin.json

Копируется как из корня исходного плагина. Содержит:

| Поле | Назначение в dist |
|---|---|
| `id`, `name`, `version`, `apiVersion`, `schemaVersion` | Идентификация |
| `provides` | Capabilities плагина |
| `requires`, `optionalRequires` | Зависимости от capabilities |
| `permissions` | Запрашиваемые разрешения |
| `frontend.entry` | Путь к frontend entry (относительно корня плагина) |
| `contributes` | UI contributions |

### frontend/dist

Содержимое `frontend/dist/` копируется в `dist/<plugin-name>/frontend/dist/`. Это результат `npm run build` — скомпилированные JS/CSS без map-файлов и dev-зависимостей.

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
2. Собирает frontend: `npm install && npm run build`.
3. Собирает backend: `go build -o <plugin-name> .`.
4. Упаковывает в `dist/<plugin-name>/` через `package_plugin()`.

### Сборка конкретного плагина

```bash
cd ~/git/verstak2/verstak-official-plugins/plugins/platform-test
# Frontend
cd frontend && npm install && npm run build
# Backend (если есть)
cd ../backend && go build -o platform-test .
# Package
mkdir -p ../../dist/platform-test
cp plugin.json ../../dist/platform-test/
cp -r frontend/dist/. ../../dist/platform-test/frontend/dist/
cp backend/platform-test ../../dist/platform-test/backend/
```

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
