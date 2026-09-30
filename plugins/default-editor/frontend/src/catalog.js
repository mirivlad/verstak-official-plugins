import { parseMarkdown, readAliases, titleKey } from './markdown.js';

export function notesFolder(request) {
  const scope = request.context?.notesScopePath;
  if (scope) return scope.replace(/\/$/, '') + '/Notes';
  const path = request.path || '';
  const index = path.indexOf('/Notes/');
  return index >= 0 ? path.slice(0, index) + '/Notes' : path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'Notes';
}

export async function readCatalog(api, folder) {
  const entries = await api.files.list(folder);
  const notes = (entries || []).filter(e => e.type === 'file' && /\.(md|markdown)$/i.test(e.name)).map(e => ({
    path: e.relativePath || `${folder}/${e.name}`, title: e.name.replace(/\.(md|markdown)$/i, '').replace(/_/g, ' '), aliases: [],
  }));
  let next = 0;
  let failures = 0;
  async function worker() {
    while (next < notes.length) {
      const note = notes[next++];
      try {
        const file = readAliases(await api.files.readText(note.path));
        note.aliases = file.aliases;
        note.body = file.body;
        note.links = parseMarkdown(file.body).links;
      } catch (_) { failures++; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, notes.length) }, worker));
  return { notes: notes.sort((a, b) => a.title.localeCompare(b.title)), failures };
}

export function matchesTitle(notes, title) {
  const match = value => notes.filter(note => [note.title, ...note.aliases].some(alias => titleKey(alias) === titleKey(value)));
  const direct = match(title);
  return direct.length ? direct : match(title.replace(/\.(md|markdown)$/i, ''));
}

export function backlinkSnippet(note, target, notes) {
  const titles = (note.links || []).filter(title => {
    const found = matchesTitle(notes, title);
    return found.length === 1 && found[0].path === target;
  });
  if (!titles.length) return '';
  const line = (note.body || '').split(/\r?\n/).find(line => titles.some(title => line.includes(`[[${title}]]`)));
  return (line || `[[${titles[0]}]]`).trim().slice(0, 180);
}
