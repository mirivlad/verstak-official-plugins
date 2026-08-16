from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old!r}')
    p.write_text(text.replace(old, new, 1))

replace_once(
    'plugins/activity/frontend/src/index.js',
    "detail: {\n          kind: 'journal',\n          toolRequest: { type: 'work-session-candidate', candidate: candidate }\n        }",
    "detail: {\n          workspaceItemId: 'verstak.journal.workspace',\n          toolRequest: { type: 'work-session-candidate', candidate: candidate }\n        }",
)
replace_once(
    'plugins/todo/frontend/src/index.js',
    "window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', { detail: { kind: 'todo' } }));",
    "window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', { detail: { workspaceItemId: 'verstak.todo.workspace' } }));",
)
replace_once(
    'plugins/todo/frontend/src/index.js',
    "detail: {\n          kind: 'journal',\n          toolRequest: {",
    "detail: {\n          workspaceItemId: 'verstak.journal.workspace',\n          toolRequest: {",
)
replace_once(
    'scripts/smoke-todo-plugin.js',
    "if (!journalEvent || !journalEvent.detail || journalEvent.detail.kind !== 'journal') {",
    "if (!journalEvent || !journalEvent.detail || journalEvent.detail.workspaceItemId !== 'verstak.journal.workspace') {",
)

# Guard the exact migration: these producers must not fall back to semantic kind matching.
for path in ['plugins/activity/frontend/src/index.js', 'plugins/todo/frontend/src/index.js']:
    text = Path(path).read_text()
    if "detail: { kind: 'todo' }" in text or "kind: 'journal'" in text:
        raise SystemExit(f'{path}: legacy workspace-open-tool kind dispatch remains')
