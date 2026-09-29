# Notes editor implementation and release

Accepted scope: both stages of the notes plan, then publish an installable desktop release and stop.

- [ ] CodeMirror document, history, selection and scrolling survive mode changes.
- [ ] Undo/redo for typing, formatting, links, replacements and preview tasks; physical-key shortcuts in Russian/English layouts.
- [ ] Formatting works on selection/caret, toggles off, has active state; native list continuation and indentation.
- [ ] Reading has no formatting toolbar; Editing, Reading and Side by side modes.
- [ ] Note/web link picker, discoverable note button, completion, explicit creation, errors, aliases and backlink snippets.
- [ ] CommonMark/GFM rendering with source positions, interactive accessible tasks, precise source changes and automatic persistence.
- [ ] Readable responsive typography, tables, nested lists, outline, related notes and code highlighting/copy.
- [ ] Save status, retry, draft safety, metadata and no-op file preservation.
- [ ] Browser regression scenarios and packaged plugin integration; real Linux WebKit desktop interactions; Windows WebView2 validation if an execution environment is available.
- [ ] Fresh relevant checks, commits and pushes, packaged desktop and plugin releases verified on GitHub.

Implementation status: document session is being introduced alongside the existing frontend. The shipping entry has not been switched yet.
