<script>
  import { onDestroy, onMount } from 'svelte';
  import { Archive, AlertTriangle, CheckCircle2, ChevronRight, FolderOpen, Search, X } from 'lucide-svelte';
  import { buildDokuWikiGraph } from './dokuwiki/adapter.js';
  import { buildObsidianGraph } from './obsidian/adapter.js';
  import { detectCandidates, loadAllEntries } from './model/source.js';
  import { editPlanNode, proposePlan, serializeApplyPlan, validateEditablePlan } from './model/plan.js';

  export let api = null;

  let locale = api?.i18n?.getLocale?.() || 'en';
  let unsubscribeLocale;
  let unsubscribeProgress;
  let analysisController;
  let step = 'source';
  let source = null;
  let sourceBusy = false;
  let candidates = [];
  let selectedCandidateId = '';
  let graph = null;
  let plan = null;
  let selectedNodeId = '';
  let filter = 'all';
  let progress = null;
  let result = null;
  let confirmed = false;
  let errorMessage = '';
  let sourceClosed = false;

  $: validation = plan ? validateEditablePlan(plan) : [];
  $: selectedNode = plan?.nodes?.find((node) => node.id === selectedNodeId) || null;
  $: visibleNodes = (plan?.nodes || []).filter((node) => {
    if (filter === 'warnings') return (node.warnings || []).length > 0;
    if (filter === 'confidence') return Number(node.confidence || 1) < 0.8;
    return true;
  });
  $: planCounts = countNodes(plan?.nodes || []);
  $: candidate = candidates.find((item) => item.id === selectedCandidateId) || null;

  function tr(key, params, fallback) {
    locale;
    return api?.i18n?.t?.(key, params, fallback) || fallback || key;
  }

  function countNodes(nodes) {
    const counts = { folder: 0, workspace: 0, note: 0, file: 0, skip: 0 };
    for (const node of nodes) if (counts[node.kind] !== undefined) counts[node.kind] += 1;
    return counts;
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} ${tr('ui.bytes', null, 'B')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${tr('ui.kilobytes', null, 'KB')}`;
    return `${(bytes / 1024 / 1024).toFixed(1)} ${tr('ui.megabytes', null, 'MB')}`;
  }

  function safeError(key, fallback, error) {
    console.warn('[verstak.import] operation failed:', error);
    return tr(key, null, fallback);
  }

  async function closeCurrentSource() {
    analysisController?.abort();
    analysisController = null;
    unsubscribeProgress?.();
    unsubscribeProgress = null;
    if (source?.sourceHandle && !sourceClosed) {
      try { await api?.imports?.closeSource(source.sourceHandle); } catch (error) { console.warn('[verstak.import] close failed:', error); }
    }
    sourceClosed = true;
  }

  function resetReview() {
    graph = null;
    plan = null;
    selectedNodeId = '';
    progress = null;
    result = null;
    confirmed = false;
    errorMessage = '';
    filter = 'all';
  }

  async function selectSource(kind) {
    sourceBusy = true;
    errorMessage = '';
    await closeCurrentSource();
    source = null;
    candidates = [];
    selectedCandidateId = '';
    resetReview();
    step = 'source';
    try {
      const selected = kind === 'directory'
        ? await api.imports.selectDirectory()
        : await api.imports.selectArchive();
      if (!selected) return;
      source = selected;
      sourceClosed = false;
      const entries = await loadAllEntries(api, selected, (next) => { progress = next; });
      candidates = detectCandidates(entries);
      selectedCandidateId = candidates[0]?.id || '';
      progress = null;
      if (!candidates.length) errorMessage = tr('ui.noSourceFound', null, 'No supported DokuWiki or Obsidian content was found.');
    } catch (error) {
      errorMessage = safeError('ui.sourceFailed', 'The source could not be opened. Choose another folder or archive.', error);
    } finally {
      sourceBusy = false;
    }
  }

  async function analyze() {
    if (!source || !candidate || sourceBusy) return;
    analysisController?.abort();
    analysisController = new AbortController();
    const signal = analysisController.signal;
    step = 'analysis';
    errorMessage = '';
    progress = { phase: 'analyzing', completed: 0, total: source.entryCount || 1 };
    try {
      const onProgress = (next) => { if (!signal.aborted) progress = next; };
      graph = candidate.format === 'dokuwiki'
        ? await buildDokuWikiGraph(api, source, candidate, onProgress)
        : await buildObsidianGraph(api, source, candidate, onProgress);
      if (signal.aborted) return;
      plan = proposePlan(graph, new Date(), { locale });
      selectedNodeId = plan.nodes.find((node) => (node.warnings || []).length)?.id || plan.nodes[0]?.id || '';
      confirmed = false;
      step = 'structure';
    } catch (error) {
      if (signal.aborted) return;
      errorMessage = safeError('ui.analysisFailed', 'The source could not be analyzed. No data was imported.', error);
      step = 'source';
    } finally {
      if (!signal.aborted) progress = null;
    }
  }

  function nodeDepth(node) {
    const byId = new Map((plan?.nodes || []).map((item) => [item.id, item]));
    let depth = 0;
    let current = node;
    const seen = new Set();
    while (current?.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      depth += 1;
      current = byId.get(current.parentId);
    }
    return depth;
  }

  function nodeTypeLabel(kind) {
    return tr(`ui.nodeType.${kind}`, null, kind);
  }

  function updateSelected(patch) {
    if (!plan || !selectedNode) return;
    plan = editPlanNode(plan, selectedNode.id, patch);
  }

  function changeType(event) {
    updateSelected({ kind: event.currentTarget.value });
  }

  function changeName(event) {
    updateSelected({ name: event.currentTarget.value });
  }

  function changeTarget(event) {
    updateSelected({ targetSubpath: event.currentTarget.value });
  }

  function phaseLabel(phase) {
    return tr(`ui.phase.${phase || 'preparing'}`, null, phase || 'Preparing');
  }

  async function applyImport() {
    if (!source || !plan || validation.length || !confirmed) return;
    step = 'apply';
    errorMessage = '';
    result = null;
    progress = { phase: 'validating', completed: 0, total: plan.nodes.length, cancellable: false };
    unsubscribeProgress?.();
    unsubscribeProgress = api.imports.onProgress(source.sourceHandle, (next) => { progress = next; });
    try {
      result = await api.imports.applyPlan(source.sourceHandle, serializeApplyPlan(plan, source.fingerprint));
      const summary = {
        format: graph?.format || candidate?.format || '',
        completedAt: new Date().toISOString(),
        counts: {
          folders: result?.folders || 0,
          workspaces: result?.workspaces || 0,
          notes: result?.notes || 0,
          files: result?.files || 0,
          skipped: result?.skipped || 0,
        },
        warningCount: (graph?.warnings || []).length,
        runPath: result?.runPath || '',
      };
      await api?.storage?.data?.write('last-import', summary);
      unsubscribeProgress?.();
      unsubscribeProgress = null;
      await api.imports.closeSource(source.sourceHandle);
      sourceClosed = true;
      progress = null;
    } catch (error) {
      errorMessage = safeError('ui.applyFailed', 'The import was not completed. The existing vault was not changed.', error);
      progress = null;
      confirmed = false;
      step = 'structure';
    }
  }

  async function cancelApply() {
    if (!source || !progress?.cancellable) return;
    if (!window.confirm(tr('ui.cancelConfirm', null, 'Cancel the import? Published data will be rolled back.'))) return;
    try {
      await api.imports.cancel(source.sourceHandle);
    } catch (error) {
      errorMessage = safeError('ui.cancelFailed', 'The cancellation request could not be sent.', error);
    }
  }

  function openImported() {
    if (!result?.runPath) return;
    window.dispatchEvent(new CustomEvent('verstak:workspace-tree-changed', { detail: { runPath: result.runPath } }));
    window.dispatchEvent(new CustomEvent('verstak:nav', { detail: { viewId: 'workspace', runPath: result.runPath } }));
    window.dispatchEvent(new CustomEvent('verstak:close-settings'));
  }

  async function startOver() {
    await closeCurrentSource();
    source = null;
    candidates = [];
    selectedCandidateId = '';
    resetReview();
    step = 'source';
  }

  onMount(() => {
    unsubscribeLocale = api?.i18n?.onDidChangeLocale?.((nextLocale) => { locale = nextLocale; });
  });

  onDestroy(() => {
    unsubscribeLocale?.();
    closeCurrentSource();
  });
</script>

<section class="import-settings">
  <header class="import-header">
    <div>
      <h2>{tr('ui.title', null, 'Import')}</h2>
      <p>{tr('ui.description', null, 'Move current DokuWiki or Obsidian content into a new Imported folder.')}</p>
    </div>
  </header>

  <nav class="import-steps" aria-label={tr('ui.steps', null, 'Import steps')}>
    {#each ['source', 'analysis', 'structure', 'apply'] as item, index}
      <div class:active={step === item} class:complete={['source', 'analysis', 'structure', 'apply'].indexOf(step) > index}>
        <span>{index + 1}</span>{tr(`ui.step.${item}`, null, item)}
        {#if index < 3}<ChevronRight size={14} aria-hidden="true" />{/if}
      </div>
    {/each}
  </nav>

  {#if errorMessage}
    <div class="import-message error" role="alert"><X size={17} aria-hidden="true" /><span>{errorMessage}</span></div>
  {/if}

  {#if step === 'source'}
    <div class="import-panel" data-import-step="source">
      <div class="panel-heading">
        <h3>{tr('ui.sourceTitle', null, 'Choose a source')}</h3>
        <p>{tr('ui.sourceDescription', null, 'Select a content folder or a complete backup archive. Analysis does not write to the vault.')}</p>
      </div>
      <div class="source-actions">
        <button class="source-card" data-import-select-directory on:click={() => selectSource('directory')} disabled={sourceBusy}>
          <FolderOpen size={24} aria-hidden="true" />
          <span><strong>{tr('ui.chooseFolder', null, 'Choose folder')}</strong><small>{tr('ui.chooseFolderHint', null, 'DokuWiki data or an Obsidian vault')}</small></span>
        </button>
        <button class="source-card" data-import-select-archive on:click={() => selectSource('archive')} disabled={sourceBusy}>
          <Archive size={24} aria-hidden="true" />
          <span><strong>{tr('ui.chooseArchive', null, 'Choose archive')}</strong><small>{tr('ui.chooseArchiveHint', null, 'ZIP, TAR, TAR.GZ or TGZ backup')}</small></span>
        </button>
      </div>

      {#if sourceBusy}
        <div class="source-loading"><Search size={17} aria-hidden="true" />{tr('ui.indexing', null, 'Inspecting source…')}</div>
      {/if}
      {#if source}
        <div class="source-summary">
          <div><strong>{source.displayName}</strong><small>{source.entryCount} {tr('ui.entries', null, 'entries')} · {formatBytes(source.totalBytes)}</small></div>
          {#if candidates.length > 1}
            <label>{tr('ui.candidateLabel', null, 'Content to import')}
              <select data-import-candidate bind:value={selectedCandidateId}>
                {#each candidates as item}<option value={item.id}>{item.label}</option>{/each}
              </select>
            </label>
          {:else if candidates.length === 1}
            <span class="format-chip">{candidates[0].label}</span>
          {/if}
        </div>
      {/if}
      <div class="panel-actions end">
        <button class="primary" data-import-analyze on:click={analyze} disabled={!source || !candidate || sourceBusy}>
          <Search size={17} aria-hidden="true" />{tr('ui.analyze', null, 'Analyze')}
        </button>
      </div>
    </div>
  {:else if step === 'analysis'}
    <div class="import-panel analysis-panel" data-import-step="analysis">
      <Search size={32} aria-hidden="true" />
      <h3>{tr('ui.analysisTitle', null, 'Analyzing content')}</h3>
      <p>{tr('ui.analysisDescription', null, 'Detecting structure, links, notes and files. Nothing is written yet.')}</p>
      <div class="progress-track"><span style={`width:${Math.min(100, Math.round(100 * Number(progress?.completed || 0) / Math.max(1, Number(progress?.total || 1))))}%`}></span></div>
      <small>{phaseLabel(progress?.phase)} · {progress?.completed || 0}/{progress?.total || 0}</small>
    </div>
  {:else if step === 'structure'}
    <div class="import-panel" data-import-step="structure">
      <div class="panel-heading split-heading">
        <div><h3>{tr('ui.structureTitle', null, 'Review structure')}</h3><p>{tr('ui.structureDescription', null, 'Edit the proposal before anything is imported.')}</p></div>
        <div class="count-row">
          <span>{planCounts.folder} {tr('ui.folders', null, 'folders')}</span><span>{planCounts.workspace} {tr('ui.workspaces', null, 'Deals')}</span><span>{planCounts.note} {tr('ui.notes', null, 'notes')}</span><span>{planCounts.file} {tr('ui.files', null, 'files')}</span>
        </div>
      </div>

      <div class="import-message warning" data-import-sensitive-warning>
        <AlertTriangle size={18} aria-hidden="true" /><span>{tr('ui.sensitiveWarning', null, 'Imported material may contain logins, passwords or other private data. Review it after import and move it to Secrets or delete it yourself.')}</span>
      </div>

      <div class="review-layout">
        <div class="tree-column">
          <div class="filter-row">
            <button class:active={filter === 'all'} on:click={() => filter = 'all'}>{tr('ui.filterAll', null, 'All')}</button>
            <button class:active={filter === 'warnings'} on:click={() => filter = 'warnings'}>{tr('ui.filterWarnings', null, 'Warnings')}</button>
            <button class:active={filter === 'confidence'} on:click={() => filter = 'confidence'}>{tr('ui.filterConfidence', null, 'Needs review')}</button>
          </div>
          <div class="import-tree" data-import-tree>
            {#each visibleNodes as node (node.id)}
              <button class:selected={node.id === selectedNodeId} class:skipped={node.kind === 'skip'} style={`--node-depth:${nodeDepth(node)}`} on:click={() => selectedNodeId = node.id}>
                <span class="node-kind">{nodeTypeLabel(node.kind)}</span><span class="node-name">{node.name}</span>
                {#if (node.warnings || []).length}<AlertTriangle size={14} aria-label={tr('ui.hasWarnings', null, 'Has warnings')} />{/if}
              </button>
            {:else}
              <p class="empty-state">{tr('ui.noFilteredNodes', null, 'No items match this filter.')}</p>
            {/each}
          </div>
        </div>

        <aside class="node-inspector">
          {#if selectedNode}
            <h4>{tr('ui.itemSettings', null, 'Item settings')}</h4>
            <label>{tr('ui.type', null, 'Type')}
              <select data-import-node-type value={selectedNode.kind} on:change={changeType}>
                {#each ['folder', 'workspace', 'note', 'file', 'skip'] as kind}<option value={kind}>{nodeTypeLabel(kind)}</option>{/each}
              </select>
            </label>
            <label>{tr('ui.name', null, 'Name')}<input data-import-node-name value={selectedNode.name} on:input={changeName} /></label>
            {#if selectedNode.kind === 'note' || selectedNode.kind === 'file'}
              <label>{tr('ui.targetPath', null, 'Path inside the Deal')}<input value={selectedNode.targetSubpath || ''} on:input={changeTarget} /></label>
            {/if}
            <dl>
              <div><dt>{tr('ui.reason', null, 'Reason')}</dt><dd>{tr(`ui.reason.${selectedNode.reason}`, null, selectedNode.reason || '—')}</dd></div>
              <div><dt>{tr('ui.confidence', null, 'Confidence')}</dt><dd>{Math.round(Number(selectedNode.confidence || 0) * 100)}%</dd></div>
            </dl>
            {#if (selectedNode.warnings || []).length}
              <div class="node-warnings"><strong>{tr('ui.warnings', null, 'Warnings')}</strong>{#each selectedNode.warnings as warning}<p>{tr(`ui.warning.${warning.code}`, null, warning.code)}</p>{/each}</div>
            {/if}
            {#each validation.filter((issue) => issue.nodeId === selectedNode.id) as issue}
              <p class="field-error">{tr(`ui.validation.${issue.code}`, null, issue.message)}</p>
            {/each}
          {:else}
            <p class="empty-state">{tr('ui.selectItem', null, 'Select an item in the proposal.')}</p>
          {/if}
        </aside>
      </div>

      {#if validation.length}
        <div class="import-message error"><X size={17} aria-hidden="true" /><span>{tr('ui.validationSummary', { count: validation.length }, 'Fix {count} issue(s) before importing.')}</span></div>
      {/if}
      <label class="confirmation"><input type="checkbox" bind:checked={confirmed} /> <span>{tr('ui.confirmPlan', null, 'I reviewed the proposed structure and want to create it under Imported.')}</span></label>
      <div class="panel-actions between">
        <button class="secondary" on:click={() => step = 'source'}>{tr('ui.back', null, 'Back')}</button>
        <button class="primary" on:click={applyImport} disabled={validation.length > 0 || !confirmed}>{tr('ui.import', null, 'Import')}</button>
      </div>
    </div>
  {:else}
    <div class="import-panel apply-panel" data-import-step="apply">
      {#if result}
        <div class="result-icon"><CheckCircle2 size={36} aria-hidden="true" /></div>
        <div data-import-result>
          <h3>{tr('ui.completeTitle', null, 'Import complete')}</h3>
          <p>{tr('ui.completeDescription', null, 'The new content is ready in Imported. You can arrange it manually.')}</p>
          <code>{result.runPath}</code>
        </div>
        <div class="result-counts">
          <span><strong>{result.folders || 0}</strong>{tr('ui.folders', null, 'folders')}</span>
          <span><strong>{result.workspaces || 0}</strong>{tr('ui.workspaces', null, 'Deals')}</span>
          <span><strong>{result.notes || 0}</strong>{tr('ui.notes', null, 'notes')}</span>
          <span><strong>{result.files || 0}</strong>{tr('ui.files', null, 'files')}</span>
          <span><strong>{result.skipped || 0}</strong>{tr('ui.skipped', null, 'skipped')}</span>
        </div>
        <div class="panel-actions center"><button class="secondary" on:click={startOver}>{tr('ui.importAnother', null, 'Import another')}</button><button class="primary" on:click={openImported}>{tr('ui.openImported', null, 'Open imported')}</button></div>
      {:else}
        <Search size={32} aria-hidden="true" />
        <h3>{tr('ui.applyingTitle', null, 'Creating imported content')}</h3>
        <p>{tr('ui.applyingDescription', null, 'Verstak is validating and publishing the reviewed plan.')}</p>
        <div class="progress-track"><span style={`width:${Math.min(100, Math.round(100 * Number(progress?.completed || 0) / Math.max(1, Number(progress?.total || 1))))}%`}></span></div>
        <small>{phaseLabel(progress?.phase)} · {progress?.completed || 0}/{progress?.total || 0}</small>
        <button class="secondary" data-import-cancel on:click={cancelApply} disabled={!progress?.cancellable}>{tr('ui.cancel', null, 'Cancel')}</button>
      {/if}
    </div>
  {/if}
</section>
