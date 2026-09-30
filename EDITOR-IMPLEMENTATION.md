# Notes editor implementation and release

Accepted scope: both stages of the notes plan, then publish an installable desktop release and stop.

- [x] CodeMirror document, history, selection and scrolling survive mode changes.
- [x] Undo/redo for typing, formatting, links, replacements and preview tasks; physical-key shortcuts in Russian/English layouts.
- [x] Formatting works on selection/caret, toggles off, has active state; native list continuation and indentation.
- [x] Reading has no formatting toolbar; Editing, Reading and Side by side modes.
- [x] Note/web link picker, discoverable note button, completion, explicit creation, errors, aliases and backlink snippets.
- [x] CommonMark/GFM rendering with source positions, interactive accessible tasks, precise source changes and automatic persistence.
- [x] Readable responsive typography, tables, nested lists, outline, related notes and code highlighting/copy.
- [x] Save status, retry, draft safety, metadata and no-op file preservation.
- [x] Browser regression scenarios and packaged plugin integration; real Linux WebKit desktop interactions. Windows WebView2 runtime is unavailable in this Linux environment and was not tested.
- [ ] Fresh relevant checks, commits and pushes, packaged desktop and plugin releases verified on GitHub.

The shipping entry now loads the bundled CodeMirror editor. Verification on 2026-09-30: 10 model/parser tests, 16 Chromium scenarios and the same 16 in Playwright WebKit; the full workspace check passed all nine groups including 179 desktop E2E scenarios. Subsequent native-focus, modifier and CSS corrections passed the editor suites again.

Real Linux WebKitGTK was driven with xdotool in an isolated Xvfb vault. Checked note-link insertion and navigation, typing undo/redo, code clipboard contents, and a nested preview task's persisted Markdown through click -> Ctrl+Z -> Ctrl+Shift+Z. Native screenshots caught and guided fixes for checkbox contrast, picker select styling and checkbox keyboard focus. No user vault was used.

Publication target: official plugins v0.1.5 and desktop v0.2.5. The publication checkbox is deliberately left open until GitHub assets exist; a successful local build is not a published release.
