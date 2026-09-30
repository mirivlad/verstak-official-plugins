import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import cpp from 'highlight.js/lib/languages/cpp';

const grammars = { javascript, typescript, python, bash, json, yaml, go, rust, sql, css, xml, cpp };
const aliases = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', yml: 'yaml', html: 'xml', 'c++': 'cpp', c: 'cpp', rs: 'rust' };

export function highlightCode(root) {
  for (const code of root.querySelectorAll('pre code')) {
    const declared = [...code.classList].find(value => value.startsWith('language-'))?.slice(9).toLowerCase();
    const language = aliases[declared] || declared;
    if (!grammars[language]) continue;
    if (!hljs.getLanguage(language)) hljs.registerLanguage(language, grammars[language]);
    // highlight.js escapes the source text; user-supplied HTML is never used here.
    code.innerHTML = hljs.highlight(code.textContent, { language, ignoreIllegals: true }).value;
    code.classList.add('hljs');
  }
}
