import { EditorState, Compartment, Transaction } from '@codemirror/state';
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { history, undo, redo, undoDepth, redoDepth, defaultKeymap, indentMore, indentLess, isolateHistory } from '@codemirror/commands';
import { markdown, markdownKeymap } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';

const proseHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.55em', fontWeight: '700' },
  { tag: tags.heading2, fontSize: '1.3em', fontWeight: '650' },
  { tag: tags.heading, color: 'var(--de-text, #e0e0ec)', fontWeight: '650' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--de-accent, #4ecca3)' },
  { tag: tags.url, color: 'var(--de-accent, #4ecca3)' },
  { tag: tags.monospace, fontFamily: 'monospace', color: '#b6d9fc' },
  { tag: tags.processingInstruction, color: '#9999b5' },
]);

// The session owns history and selection even when there is no editing pane.
// Preview tasks, toolbar commands and typing all dispatch into this same state.
export function createDocument({ text = '', isMarkdown = true, onChange = () => {}, completeNotes, onShortcut } = {}) {
  const wrap = new Compartment();
  let view = null;
  let scrollTop = 0;
  let scrollLeft = 0;
  let state = EditorState.create({
    doc: text,
    extensions: [
      history(), drawSelection(), bracketMatching(), highlightActiveLine(),
      EditorState.allowMultipleSelections.of(true),
      EditorState.tabSize.of(2),
      wrap.of(EditorView.lineWrapping),
      ...(isMarkdown ? [markdown(), syntaxHighlighting(proseHighlight)] : []),
      keymap.of([
        ...(isMarkdown ? markdownKeymap : []),
        { key: 'Tab', run: indentMore }, { key: 'Shift-Tab', run: indentLess },
        ...completionKeymap, ...defaultKeymap,
      ]),
      ...(completeNotes ? [autocompletion({ override: [completeNotes] })] : []),
      EditorView.contentAttributes.of({ 'aria-label': 'Note text', 'data-editor-textarea': '', spellcheck: 'true' }),
      EditorView.domEventHandlers({ keydown: (event) => onShortcut ? onShortcut(event) : false }),
      EditorView.theme({
        '&': { height: '100%', fontSize: '15px', color: 'var(--de-text, #dedeea)', backgroundColor: 'transparent' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'inherit', lineHeight: '1.65' },
        '.cm-content': { padding: '18px 24px', minHeight: '100%', caretColor: 'var(--de-accent, #4ecca3)' },
        '.cm-focused': { outline: 'none' },
        '&.cm-focused': { outline: 'none' },
        '.cm-activeLine': { backgroundColor: '#ffffff04' },
        '.cm-cursor': { borderLeftColor: '#4ecca3' },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { background: '#365b7866' },
        '.cm-tooltip': { backgroundColor: '#182239', color: '#dedeea', border: '1px solid #45607d' },
        '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: '#27554b', color: '#fff' },
      }, { dark: true }),
    ],
  });

  function dispatch(...specs) {
    if (view) view.dispatch(...specs);
    else accept(state.update(...specs));
  }
  function accept(transaction) {
    state = transaction.state;
    onChange({ docChanged: transaction.docChanged, selectionChanged: !!transaction.selection });
  }
  const target = { get state() { return state; }, dispatch: (transaction) => {
    if (view) view.dispatch(transaction);
    else accept(transaction);
  } };
  function change(changes, selection, event = 'input.command') {
    dispatch({ changes, selection, scrollIntoView: true, annotations: [Transaction.userEvent.of(event), isolateHistory.of('full')] });
  }
  function replaceSelection(insert, selectInserted = false) {
    const { from, to } = state.selection.main;
    change({ from, to, insert }, { anchor: selectInserted ? from : from + insert.length, head: from + insert.length });
  }
  function wrapSelection(marker, close = marker, placeholder = '') {
    const { from, to } = state.selection.main;
    const selected = state.sliceDoc(from, to);
    if (selected.startsWith(marker) && selected.endsWith(close) && selected.length >= marker.length + close.length) {
      change({ from, to, insert: selected.slice(marker.length, -close.length) }, { anchor: from, head: to - marker.length - close.length });
    } else if (state.sliceDoc(Math.max(0, from - marker.length), from) === marker && state.sliceDoc(to, to + close.length) === close) {
      change([{ from: from - marker.length, to: from, insert: '' }, { from: to, to: to + close.length, insert: '' }],
        { anchor: from - marker.length, head: to - marker.length });
    } else {
      const inner = selected || placeholder;
      change({ from, to, insert: marker + inner + close }, { anchor: from + marker.length, head: from + marker.length + inner.length });
    }
  }
  const lineStyles = {
    heading: { match: /^#{1,6} /, prefix: '# ' },
    bullet: { match: /^\s*[-+*] (?!\[[ xX]\] )/, prefix: '- ' },
    numbered: { match: /^\s*\d+[.)] /, prefix: '1. ' },
    quote: { match: /^> ?/, prefix: '> ' },
    task: { match: /^\s*[-+*] \[[ xX]\] /, prefix: '- [ ] ' },
  };
  function selectedLines() {
    const { from, to } = state.selection.main;
    const first = state.doc.lineAt(from).number;
    const last = state.doc.lineAt(to > from && state.doc.lineAt(to).from === to ? to - 1 : to).number;
    return Array.from({ length: last - first + 1 }, (_, i) => state.doc.line(first + i));
  }
  function active(action) {
    const style = lineStyles[action];
    if (style) return selectedLines().every(line => style.match.test(line.text));
    const marker = { bold: '**', italic: '*', code: '`' }[action];
    if (!marker) return false;
    const { from, to } = state.selection.main;
    return state.sliceDoc(Math.max(0, from - marker.length), from) === marker && state.sliceDoc(to, to + marker.length) === marker;
  }
  function format(action) {
    if (action === 'bold') wrapSelection('**');
    else if (action === 'italic') wrapSelection('*');
    else if (action === 'code') wrapSelection('`');
    else if (action === 'code-block') wrapSelection('```\n', '\n```');
    else if (lineStyles[action]) {
      const style = lineStyles[action];
      const lines = selectedLines();
      const remove = lines.every(line => style.match.test(line.text));
      const changes = lines.map((line, index) => {
        if (remove) return { from: line.from, to: line.from + line.text.match(style.match)[0].length, insert: '' };
        // A paragraph has one list type. Changing type replaces its marker.
        const previous = action === 'quote' || action === 'heading' ? null : line.text.match(/^\s*(?:[-+*] (?:\[[ xX]\] )?|\d+[.)] )/);
        return { from: line.from, to: line.from + (previous ? previous[0].length : 0), insert: action === 'numbered' ? `${index + 1}. ` : style.prefix };
      });
      change(changes);
    }
    view?.focus();
  }
  return {
    get state() { return state; },
    get text() { return state.doc.toString(); },
    get selection() { return state.selection.main; },
    get view() { return view; },
    get canUndo() { return undoDepth(state) > 0; },
    get canRedo() { return redoDepth(state) > 0; },
    dispatch, change, replaceSelection, format, active,
    undo: () => undo(target), redo: () => redo(target),
    select(from, to = from) { dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true }); },
    setWrap(enabled) { dispatch({ effects: wrap.reconfigure(enabled ? EditorView.lineWrapping : []) }); },
    focus() { view?.focus(); },
    mount(parent) {
      this.unmount();
      view = new EditorView({ state, parent, dispatchTransactions(transactions, editor) {
        editor.update(transactions);
        state = editor.state;
        onChange({ docChanged: transactions.some(t => t.docChanged), selectionChanged: transactions.some(t => t.selection) });
      } });
      view.scrollDOM.scrollTop = scrollTop;
      view.scrollDOM.scrollLeft = scrollLeft;
      return view;
    },
    unmount() {
      if (!view) return;
      scrollTop = view.scrollDOM.scrollTop;
      scrollLeft = view.scrollDOM.scrollLeft;
      state = view.state;
      view.destroy();
      view = null;
    },
  };
}
