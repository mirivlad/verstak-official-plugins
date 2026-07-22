import { describe, expect, it } from 'vitest';
import { detectObsidianCandidates } from './detect.js';

const file = (path) => ({ id: path, path, kind: 'file', size: 1 });

describe('Obsidian detection', () => {
  it('finds marker-backed direct and wrapped vaults', () => {
    expect(detectObsidianCandidates([
      file('Notes/.obsidian/app.json'),
      file('Notes/Start.md'),
      file('Other/.obsidian/workspace.json'),
      file('Other/Page.md'),
    ])).toEqual([
      { id: 'obsidian:Notes', format: 'obsidian', root: 'Notes', label: 'Obsidian — Notes' },
      { id: 'obsidian:Other', format: 'obsidian', root: 'Other', label: 'Obsidian — Other' },
    ]);
  });

  it('detects a one-wrapper Markdown vault without settings', () => {
    expect(detectObsidianCandidates([file('Vault/Start.md'), file('Vault/Projects/Plan.md')])).toEqual([
      { id: 'obsidian:Vault', format: 'obsidian', root: 'Vault', label: 'Obsidian — Vault' },
    ]);
  });
});
