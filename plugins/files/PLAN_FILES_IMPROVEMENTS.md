# План улучшений файлового менеджера Verstak2

> **Архитектура:** Плагин `verstak.files` в монорепозитории `verstak-official-plugins`.
> Код: `plugins/files/frontend/src/index.js` (vanilla JS, VerstakPluginRegister).
> API: `api.files.*`, `api.workbench.openResource()`, `api.settings`, `api.events`, `api.commands`.

## Порядок реализации

| # | Feature | Приоритет | Зависит от |
|---|---------|-----------|------------|
| 1 | Контекстное меню (правый клик) | 🔥 High | — |
| 2 | Open External / Show in Explorer | ✅ Done | `files.openExternal` |
| 3 | Кастомный ConfirmModal | 🔥 High | — |
| 4 | Duplicate | 🔥 High | — |
| 5 | Cut/Copy/Paste | 🔥 High | — |
| 6 | Множественное выделение | 🔥 High | — |
| 7 | Drag-and-Drop | 🔥 High | — |
| 8 | Клавиатурная навигация (Ctrl+A, Escape, стрелки) | Medium | #6 |
| 9 | Богатые иконки (как в v1) | Medium | — |
| 10 | История навигации | Medium | — |
| 11 | Rename с валидацией | Medium | — |

---

### Feature 1: Контекстное меню (правый клик)

**Описание:** При правом клике на файле/папке показывать меню с действиями.

**Пункты меню:** Open, Open External, Show in Explorer, Rename, Duplicate, Cut, Copy, Delete — с разделителями.

**Архитектура:**
- Событие `contextmenu` на `.files-item`
- Позиционирование у курсора (event.clientX/Y)
- Кастомный `<div>` с пунктами, закрывается по клику вне или Escape
- Класс `.files-context-menu` для стилей

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 2: Open External / Show in Explorer

**Описание:** Пункты меню для открытия файла во внешнем приложении и показа
файла/папки в системном файловом менеджере.

**Текущий v2 статус:** плагин использует публичные методы
`api.files.openExternal(relativePath)` и `api.files.showInFolder(relativePath)`,
guarded by `files.openExternal`. Fallback modal с vault-relative path и кнопкой
`Copy Path` показывается только если API недоступен или вернул ошибку.

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 3: Кастомный ConfirmModal

**Описание:** Вместо `window.confirm()` — стилизованный modal с кнопками Отмена/Удалить, опасным стилем (красная кнопка).

**Архитектура:**
- Функция `confirmModal(message, options)` возвращает Promise
- Создаёт overlay + modal в DOM
- Закрывается по Escape или кнопке Отмена

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 4: Duplicate

**Описание:** Копирование файла/папки в той же папке с добавлением суффикса (напр. "filename_copy.ext", "filename_2.ext").

**Архитектура:**
- Для файла: `api.files.readText()` + `api.files.writeText()` с новым именем
- Для папки: рекурсивное копирование (сложнее, можно defer)
- Пункт в контекстном меню: "Duplicate"

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 5: Cut/Copy/Paste

**Описание:** Буфер обмена внутри файлового менеджера. Cut → перенос. Copy → дублирование. Paste в текущую папку.

**Архитектура:**
- `clipboard: { items: [...], mode: 'cut'|'copy' }`
- Клавиши Ctrl+X/C/V
- Пункты в контекстном меню

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 6: Множественное выделение

**Описание:** Ctrl+click (toggle), Shift+click (range), Ctrl+A (select all). Массовые операции (Trash, Copy, Paste).

**Архитектура:**
- `selectedPaths: Set<string>` вместо `selectedPath: string`
- Ctrl+click → toggle entry в Set
- Shift+click → range select от последнего клика
- Действия применяются ко всем выделенным

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 7: Drag-and-Drop

**Описание:** Перемещение файлов/папок между папками через drag-and-drop.

**Архитектура:**
- HTML5 DnD API: `dragstart`, `dragover`, `drop` на `.files-item`
- При drop на папку → `api.files.move()`
- Визуальная индикация (подсветка папки при наведении)
- Отмена по Escape

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 8: Клавиатурная навигация

**Описание:** Escape (снять выделение), Ctrl+A (select all), стрелки (навигация по строкам).

**Зависит от:** Feature 6 (множественное выделение)

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 9: Богатые иконки

**Описание:** Как в v1 — отдельные SVG иконки для image, video, audio, pdf, document, spreadsheet, presentation, archive, code, text.

**Архитектура:** Расширить функцию `fileIcon()`.

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 10: История навигации

**Описание:** Кнопки Back/Forward в тулбаре, как в браузере. Хранение стека посещённых папок.

**Архитектура:**
- `historyStack: string[]` с индексом
- back() / forward() / push(path)

**Файлы:** `plugins/files/frontend/src/index.js`

---

### Feature 11: Rename с валидацией

**Описание:** Проверять имя через API до применения. Показывать ошибку под полем, а не в placeholder.

**Архитектура:**
- Проверка: не пустое, нет `/`, нет null byte, не `.verstak`
- API коллизии: `api.files.metadata(newPath)` — если существует, ошибка

**Файлы:** `plugins/files/frontend/src/index.js`
