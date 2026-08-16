from pathlib import Path


def replace_once(path, old, new):
    path = Path(path)
    text = path.read_text()
    assert old in text, f'pattern not found in {path}'
    assert text.count(old) == 1, f'pattern not unique in {path}'
    path.write_text(text.replace(old, new, 1))

replace_once(
    'plugins/todo/frontend/src/index.js',
    "        attention: todos.map(function (todo) {",
    "        attention: todos.map(function (todo, index) {"
)
replace_once(
    'plugins/todo/frontend/src/index.js',
    "            occurredAt: todo.reminderAt || todo.dueAt || todo.updatedAt || todo.createdAt || '',\n            action: { workspaceItemId: 'verstak.todo.workspace' }",
    "            occurredAt: todo.reminderAt || todo.dueAt || todo.updatedAt || todo.createdAt || '',\n            order: 10 + index,\n            action: { workspaceItemId: 'verstak.todo.workspace' }"
)

replace_once(
    'plugins/browser-inbox/frontend/src/index.js',
    "        attention: pending.map(function (capture) {",
    "        attention: pending.map(function (capture, index) {"
)
replace_once(
    'plugins/browser-inbox/frontend/src/index.js',
    "            occurredAt: capture.capturedAt || capture.receivedAt || '',\n            action: action",
    "            occurredAt: capture.capturedAt || capture.receivedAt || '',\n            order: 100 + index,\n            action: action"
)

replace_once(
    'plugins/activity/frontend/src/index.js',
    "      var attention = candidates.map(function (candidate) {",
    "      var attention = candidates.map(function (candidate, index) {"
)
replace_once(
    'plugins/activity/frontend/src/index.js',
    "          occurredAt: candidate.endedAt || candidate.startedAt || '',\n          action: overviewAction('verstak.journal.workspace', { type: 'work-session-candidate', candidate: candidate })",
    "          occurredAt: candidate.endedAt || candidate.startedAt || '',\n          order: 200 + index,\n          action: overviewAction('verstak.journal.workspace', { type: 'work-session-candidate', candidate: candidate })"
)
