/* ===========================================================
   Journal Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.journal';
  var WORKLOG_PREFIX = 'worklog:workspace:';
  var ACTIVITY_PLUGIN_ID = 'verstak.activity';
  var ASSIGN_ACTIVITY_COMMAND = 'verstak.activity.assignBrowserActivity';
  var SET_RULE_COMMAND = 'verstak.activity.setBrowserActivityRule';

  function injectStyles() {
    if (document.getElementById('journal-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'journal-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.journal-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.journal-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.55rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-shrink:0;flex-wrap:wrap}',
    '.journal-title{font-size:.86rem;font-weight:600}',
    '.journal-count{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-spacer{flex:1}',
    '.journal-btn{font-size:.78rem;padding:.36rem .65rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.35rem}',
    '.journal-btn svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.journal-btn:hover{border-color:var(--vt-color-accent,#4ecca3);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-btn:disabled{opacity:.45;cursor:default}',
    '.journal-filters{display:flex;align-items:center;gap:.4rem;padding:.4rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface,#15152c);flex-wrap:wrap}',
    '.journal-filter{font-size:.78rem;padding-top:.2rem;padding-bottom:.2rem;width:auto;min-width:9rem}',
    '.journal-total{font-size:.78rem;color:var(--vt-color-text-secondary,#b7c0d4);white-space:nowrap}',
    '.journal-status{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-status.error{display:inline-flex;border:1px solid rgba(233,69,96,.45);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-danger-muted,rgba(233,69,96,.14));color:#ffc6ce;padding:.18rem .4rem}',
    '.journal-input{font-size:.8rem;padding:.38rem .5rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);min-width:0;font-family:inherit}',
    '.journal-input.textarea{min-height:7rem;resize:vertical;line-height:1.4}',
    '.journal-input.journal-select{appearance:none;background-color:#0f1424;background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:1.7rem}.journal-input.journal-select option{background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-input:focus{outline:none;border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.journal-billable{display:flex;align-items:center;gap:.25rem;font-size:.74rem;color:var(--vt-color-text-secondary,#b7c0d4);white-space:nowrap}',
    '.journal-proposals{flex-shrink:0;max-height:40%;overflow:auto;padding:.5rem .75rem .6rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629)}',
    '.journal-proposals[hidden]{display:none}',
    '.journal-proposals-title{font-size:.74rem;font-weight:600;color:var(--vt-color-text-secondary,#b7c0d4);margin-bottom:.4rem}',
    '.journal-proposal-actions{display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end}',
    '.journal-proposal{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:.7rem;align-items:center;margin-top:.4rem;padding:.6rem .7rem;border:1px solid rgba(78,204,163,.34);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface,#15152c)}',
    '.journal-btn-icon{display:inline-flex}',
    '.journal-btn-icon svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.journal-list{flex:1;min-height:0;overflow:auto;background:var(--vt-color-background,#101020)}',
    '.journal-list[hidden]{display:none}',
    '.journal-report-head{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin:.5rem .75rem 0;padding:.75rem .85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}',
    '.journal-report-span{font-size:.86rem;font-weight:600;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-report-figures{display:flex;gap:1.1rem;flex-wrap:wrap}',
    '.journal-report-figure-label{font-size:.7rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-report-figure-value{font-size:.95rem;font-weight:650;color:var(--vt-color-accent,#4ecca3)}',
    '.journal-report-actions{display:flex;gap:.4rem;margin-left:auto;flex-wrap:wrap}',
    '.journal-report-deal{margin:.5rem .75rem 0;padding:.75rem .85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}',
    '.journal-report-deal-head{display:flex;align-items:baseline;gap:.7rem;justify-content:space-between}',
    '.journal-report-row{display:grid;grid-template-columns:7rem minmax(0,1fr) auto;gap:.7rem;padding:.32rem 0;border-top:1px solid var(--vt-color-border,#202b46);align-items:baseline}',
    '.journal-report-title{font-size:.82rem;color:var(--vt-color-text-secondary,#b7c0d4);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.journal-empty{height:100%;display:flex;align-items:center;justify-content:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.86rem;padding:2rem;text-align:center}',
    '.journal-row{display:grid;grid-template-columns:8rem minmax(0,1fr) auto auto;gap:.7rem;margin:.5rem .75rem 0;padding:.75rem .85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);align-items:start}',
    '.journal-row:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.journal-date{font-size:.75rem;color:var(--vt-color-text-muted,#7f8aa3);white-space:nowrap}',
    '.journal-main{min-width:0}',
    '.journal-entry-title{font-size:.88rem;color:var(--vt-color-text-primary,#f4f7fb);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.journal-summary{margin-top:.25rem;font-size:.78rem;line-height:1.4;color:var(--vt-color-text-secondary,#b7c0d4);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.journal-meta{margin-top:.25rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-minutes{font-size:.78rem;color:var(--vt-color-accent,#4ecca3);white-space:nowrap}',
    '.journal-row-actions{display:flex;gap:.25rem}',
    '.journal-icon-btn{width:1.65rem;height:1.65rem;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-sm,4px);background:transparent;color:var(--vt-color-text-muted,#7f8aa3);cursor:pointer;padding:0}',
    '.journal-icon-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-accent,#4ecca3)}',
    '.journal-icon-btn.danger:hover{border-color:rgba(233,69,96,.65);color:var(--vt-color-danger,#e94560)}',
    '.journal-icon-btn svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.journal-modal-host[hidden]{display:none}',
    '.journal-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem}',
    '.journal-modal{width:520px;max-width:96vw;display:grid;gap:.75rem;padding:1rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);box-shadow:0 18px 44px rgba(0,0,0,.38)}',
    '.journal-modal-title{font-size:.95rem;font-weight:650;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-modal-grid{display:grid;grid-template-columns:1fr 8rem;gap:.6rem}',
    '.journal-field{display:grid;gap:.3rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-field.wide{grid-column:1/-1}',
    '.journal-candidate-context{display:grid;gap:.22rem;padding:.65rem .7rem;border:1px solid rgba(78,204,163,.34);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-muted,#111629);font-size:.76rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.journal-candidate-context strong{color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-candidate-activities{display:grid;gap:.35rem;margin:0;padding:.65rem .7rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-md,6px);font-size:.74rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.journal-candidate-activities legend{padding:0 .2rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-candidate-activity{display:flex;align-items:flex-start;gap:.45rem;line-height:1.35;overflow-wrap:anywhere}',
    '.journal-modal-actions{display:flex;justify-content:flex-end;gap:.5rem}',
    '.journal-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}',
    '.journal-btn.ghost{background:transparent}',
    '@media(max-width:820px){.journal-row{grid-template-columns:1fr}.journal-btn{width:100%}.journal-toolbar{align-items:stretch}.journal-status{width:100%}.journal-modal-grid{grid-template-columns:1fr}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] == null) return;
        if (key === 'className') elem.className = attrs[key];
        else if (key === 'innerHTML') elem.innerHTML = attrs[key];
        else if (key === 'textContent') elem.textContent = attrs[key];
        else if (key.slice(0, 2) === 'on') elem.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        else elem.setAttribute(key, attrs[key]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (child) {
        if (child == null) return;
        elem.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }
    return elem;
  }

  function text(value) {
    return String(value == null ? '' : value);
  }

  function cleanWorkspace(value) {
    return text(value).trim().replace(/^\/+|\/+$/g, '');
  }

  function encodeKey(value) {
    return encodeURIComponent(text(value).trim());
  }

  function workspaceFromProps(props) {
    var node = props && props.workspaceNode;
    return cleanWorkspace((props && (props.workspaceRootPath || props.workspaceName || props.workspaceNodeId))
      || (node && (node.rootPath || node.name || node.id)));
  }

  function scopeFromProps(props) {
    var workspaceRoot = workspaceFromProps(props || {});
    if (!workspaceRoot) return { mode: 'global', key: '', label: 'All Deals', workspaceRoot: '' };
    return {
      mode: 'workspace',
      key: WORKLOG_PREFIX + encodeKey(workspaceRoot),
      label: workspaceRoot,
      workspaceRoot: workspaceRoot
    };
  }

  // The day on the user's own calendar. toISOString() is UTC, so east of
  // Greenwich everything written in the evening was dated yesterday.
  function isoDay(date) {
    var month = String(date.getMonth() + 1);
    var day = String(date.getDate());
    return date.getFullYear() + '-' + (month.length < 2 ? '0' + month : month) + '-' + (day.length < 2 ? '0' + day : day);
  }

  function today() {
    return isoDay(new Date());
  }

  function normalizeEntry(value, storageKey) {
    value = value || {};
    return {
      entryId: text(value.entryId || ('entry:' + Date.now())),
      workspaceRootPath: cleanWorkspace(value.workspaceRootPath || decodeWorkspaceKey(storageKey)),
      date: text(value.date || today()).slice(0, 10),
      title: text(value.title || 'Worklog entry'),
      summary: text(value.summary),
      minutes: Math.max(0, Number(value.minutes || 0)),
      billable: value.billable === true,
      sourceCandidateId: text(value.sourceCandidateId || value.sourceSuggestionId),
      sourceTodoId: text(value.sourceTodoId),
      activityIds: Array.isArray(value.activityIds)
        ? value.activityIds.map(text)
        : (Array.isArray(value.eventIds) ? value.eventIds.map(text) : [])
    };
  }

  function decodeWorkspaceKey(key) {
    if (!key || key.indexOf(WORKLOG_PREFIX) !== 0) return '';
    try {
      return decodeURIComponent(key.slice(WORKLOG_PREFIX.length));
    } catch (err) {
      return key.slice(WORKLOG_PREFIX.length);
    }
  }

  function normalizeEntries(value, storageKey) {
    if (!Array.isArray(value)) return [];
    return value.map(function (item) { return normalizeEntry(item, storageKey); });
  }

  function sortEntries(entryList) {
    var seen = {};
    return entryList.filter(function (entry) {
      var key = entry.sourceCandidateId
        ? 'candidate:' + entry.sourceCandidateId
        : (entry.sourceTodoId ? 'todo:' + entry.sourceTodoId : 'entry:' + entry.entryId);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice().sort(function (a, b) {
      return text(b.date).localeCompare(text(a.date)) || text(b.entryId).localeCompare(text(a.entryId));
    });
  }

  function worklogKeys(settings) {
    return Object.keys(settings || {}).filter(function (key) {
      return key.indexOf(WORKLOG_PREFIX) === 0;
    });
  }

  // =====================================================================
  // The report
  //
  // A worklog answers "what did I do"; a report answers "what do I bill".
  // Everything below works from entries the journal already has -- it counts
  // and groups, and invents nothing.
  // =====================================================================
  var REPORTS_FOLDER = 'Отчёты';

  function dateOnly(value) {
    return text(value).slice(0, 10);
  }

  function shiftDays(date, days) {
    var moved = new Date(date.getTime());
    moved.setDate(moved.getDate() + days);
    return moved;
  }

  function periodRange(kind, customFrom, customTo) {
    var now = new Date();
    if (kind === 'custom') {
      var from = dateOnly(customFrom);
      var to = dateOnly(customTo);
      if (!from && !to) return null;
      return { from: from, to: to };
    }
    if (kind === 'week') {
      // Monday first. A work week starts when the work does.
      var monday = shiftDays(now, -((now.getDay() + 6) % 7));
      return { from: isoDay(monday), to: isoDay(shiftDays(monday, 6)) };
    }
    if (kind === 'month') {
      return {
        from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      };
    }
    if (kind === 'last-month') {
      return {
        from: isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: isoDay(new Date(now.getFullYear(), now.getMonth(), 0))
      };
    }
    if (kind === 'year') {
      return { from: now.getFullYear() + '-01-01', to: now.getFullYear() + '-12-31' };
    }
    return null;
  }

  function inRange(date, range) {
    if (!range) return true;
    var day = dateOnly(date);
    if (range.from && day < range.from) return false;
    if (range.to && day > range.to) return false;
    return true;
  }

  function formatDuration(minutes, tr) {
    var total = Math.max(0, Math.round(Number(minutes) || 0));
    var hours = Math.floor(total / 60);
    var rest = total % 60;
    if (!hours) return tr('ui.minutesValue', { minutes: rest }, rest + ' min');
    if (!rest) return tr('ui.report.hours', { hours: hours }, hours + ' h');
    return tr('ui.report.hoursMinutes', { hours: hours, minutes: rest }, hours + ' h ' + rest + ' min');
  }

  function buildReport(entryList) {
    var deals = [];
    var byDeal = {};
    sortForFile(entryList).forEach(function (entry) {
      var deal = cleanWorkspace(entry.workspaceRootPath);
      if (!byDeal[deal]) {
        byDeal[deal] = { deal: deal, minutes: 0, billableMinutes: 0, count: 0, days: [], byDay: {} };
        deals.push(byDeal[deal]);
      }
      var group = byDeal[deal];
      var minutes = Math.max(0, Number(entry.minutes) || 0);
      group.minutes += minutes;
      if (entry.billable) group.billableMinutes += minutes;
      group.count += 1;
      if (!group.byDay[entry.date]) {
        group.byDay[entry.date] = { date: entry.date, minutes: 0, entries: [] };
        group.days.push(group.byDay[entry.date]);
      }
      group.byDay[entry.date].minutes += minutes;
      group.byDay[entry.date].entries.push(entry);
    });
    // Most time first: the Deal that took the month is the one being asked
    // about.
    deals.sort(function (a, b) {
      return b.minutes - a.minutes || a.deal.localeCompare(b.deal);
    });
    var total = { minutes: 0, billableMinutes: 0, count: 0, from: '', to: '' };
    deals.forEach(function (group) {
      total.minutes += group.minutes;
      total.billableMinutes += group.billableMinutes;
      total.count += group.count;
      group.days.forEach(function (day) {
        if (!total.from || day.date < total.from) total.from = day.date;
        if (!total.to || day.date > total.to) total.to = day.date;
      });
      delete group.byDay;
    });
    return { deals: deals, total: total };
  }

  function reportSpan(report, range) {
    var from = (range && range.from) || report.total.from;
    var to = (range && range.to) || report.total.to;
    return { from: from, to: to };
  }

  function reportFileName(report, range) {
    var span = reportSpan(report, range);
    if (!span.from && !span.to) return 'Отчёт';
    if (span.from === span.to) return 'Отчёт ' + span.from;
    return 'Отчёт ' + (span.from || '…') + ' - ' + (span.to || '…');
  }

  function reportMarkdown(report, range, tr) {
    var span = reportSpan(report, range);
    var lines = [
      '# ' + tr('ui.report.fileHeading', { from: span.from || '…', to: span.to || '…' }, 'Worklog report — ' + (span.from || '…') + ' — ' + (span.to || '…')),
      '',
      tr('ui.report.totalLine', {
        total: formatDuration(report.total.minutes, tr),
        billable: formatDuration(report.total.billableMinutes, tr),
        nonBillable: formatDuration(report.total.minutes - report.total.billableMinutes, tr),
        count: report.total.count
      }, 'Total ' + formatDuration(report.total.minutes, tr) + ' · billable ' + formatDuration(report.total.billableMinutes, tr) + ' · non-billable ' + formatDuration(report.total.minutes - report.total.billableMinutes, tr) + ' · ' + report.total.count + ' entries'),
      ''
    ];
    report.deals.forEach(function (group) {
      lines.push('## ' + group.deal + ' — ' + formatDuration(group.minutes, tr));
      lines.push('');
      lines.push('| ' + [
        tr('ui.date', null, 'Date'),
        tr('ui.fieldTitle', null, 'Title'),
        tr('ui.minutes', null, 'Minutes'),
        tr('ui.billable', null, 'Billable')
      ].join(' | ') + ' |');
      lines.push('| --- | --- | --- | --- |');
      group.days.forEach(function (day) {
        day.entries.forEach(function (entry) {
          lines.push('| ' + [
            entry.date,
            text(entry.title).replace(/\|/g, '\\|'),
            formatDuration(entry.minutes, tr),
            entry.billable ? tr('ui.report.yes', null, 'yes') : tr('ui.report.no', null, 'no')
          ].join(' | ') + ' |');
        });
      });
      lines.push('');
      lines.push(tr('ui.report.dealTotal', {
        deal: group.deal,
        total: formatDuration(group.minutes, tr),
        billable: formatDuration(group.billableMinutes, tr)
      }, group.deal + ': ' + formatDuration(group.minutes, tr) + ', billable ' + formatDuration(group.billableMinutes, tr)));
      lines.push('');
    });
    return lines.join('\n').replace(/[ \t\n]+$/, '') + '\n';
  }

  function csvCell(value) {
    return '"' + text(value).replace(/\r?\n/g, ' ').replace(/"/g, '""') + '"';
  }

  function reportCsv(report, tr) {
    var rows = [[
      tr('ui.workspace', null, 'Deal'),
      tr('ui.date', null, 'Date'),
      tr('ui.fieldTitle', null, 'Title'),
      tr('ui.minutes', null, 'Minutes'),
      tr('ui.billable', null, 'Billable')
    ].map(csvCell).join(',')];
    report.deals.forEach(function (group) {
      group.days.forEach(function (day) {
        day.entries.forEach(function (entry) {
          rows.push([
            csvCell(group.deal),
            csvCell(entry.date),
            csvCell(entry.title),
            String(Math.max(0, Number(entry.minutes) || 0)),
            csvCell(entry.billable ? tr('ui.report.yes', null, 'yes') : tr('ui.report.no', null, 'no'))
          ].join(','));
        });
      });
    });
    return rows.join('\n') + '\n';
  }

  function entryId(workspaceRoot, date, title) {
    return 'journal:' + cleanWorkspace(workspaceRoot || 'Global') + ':' + text(date) + ':' + encodeKey(title).slice(0, 48) + ':' + Date.now();
  }

  // =====================================================================
  // The worklog is a document, not a setting
  //
  // What a worklog is for is showing someone: a client, an accountant, or
  // yourself next March. It lived in the plugin's settings, which is a JSON
  // blob under `.verstak` -- a path sync skips by design and no editor opens.
  // It now lives in the Deal it belongs to, one ordinary Markdown file per
  // month, and travels with every other file the vault carries.
  //
  //   <Deal>/Журнал/2026-07.md
  //
  // The prose belongs to the user. The comment at the end of each entry holds
  // only what has no readable form -- which entry this is, and what it was
  // made from. Where the two overlap the prose wins: someone who opens the
  // file and changes "45 мин" to "90 мин" means it.
  // =====================================================================
  var JOURNAL_FOLDER = 'Журнал';
  var ENTRY_MARK = '<!-- verstak-entry ';
  var ENTRY_MARK_END = ' -->';
  var MIGRATION_KEY = 'worklogVaultMigration';
  var MONTH_FILE = /^(\d{4}-\d{2})\.md$/;
  // "45 мин · к оплате" and its English twin, and nothing looser: a body whose
  // first line merely mentions minutes must stay a body.
  var META_LINE = /^(\d{1,6})\s*(?:мин|минут|min|minutes)[а-яё.]*\s*(?:·\s*(.+?))?\s*$/i;
  // The words the journal itself writes, in both languages it speaks. A file
  // written in Russian still reads correctly after the user switches to
  // English, because what the entry is worth is also in the record below it.
  var BILLABLE_WORDS = { 'оплачиваемая': true, 'billable': true, 'к оплате': true };
  var NON_BILLABLE_WORDS = { 'неоплачиваемая': true, 'non-billable': true, 'не к оплате': true };

  function monthOf(date) {
    return text(date).slice(0, 7);
  }

  function journalFolderPath(dealRoot) {
    return cleanWorkspace(dealRoot) + '/' + JOURNAL_FOLDER;
  }

  function monthFilePath(dealRoot, month) {
    return journalFolderPath(dealRoot) + '/' + text(month) + '.md';
  }

  // A body line that looks like structure would be read back as structure.
  // A backslash is Markdown's own way of saying "this is text".
  function escapeBodyLine(line) {
    if (/^\s*#{1,6}\s/.test(line) || line.indexOf(ENTRY_MARK) === 0) return '\\' + line;
    return line;
  }

  function unescapeBodyLine(line) {
    if (line.indexOf('\\') !== 0) return line;
    var rest = line.slice(1);
    if (/^\s*#{1,6}\s/.test(rest) || rest.indexOf(ENTRY_MARK) === 0) return rest;
    return line;
  }

  function metaLine(entry, tr) {
    var minutes = Math.max(0, Number(entry.minutes) || 0);
    return tr('ui.minutesValue', { minutes: minutes }, minutes + ' min')
      + ' · '
      + (entry.billable ? tr('ui.meta.billable', null, 'billable') : tr('ui.meta.nonBillable', null, 'non-billable'));
  }

  // Only what the prose cannot carry. An entry typed by hand has none of it and
  // is still a journal entry.
  function entryRecord(entry) {
    var record = { entryId: entry.entryId };
    if (entry.sourceCandidateId) record.sourceCandidateId = entry.sourceCandidateId;
    if (entry.sourceTodoId) record.sourceTodoId = entry.sourceTodoId;
    if (entry.activityIds && entry.activityIds.length) record.activityIds = entry.activityIds;
    record.minutes = Math.max(0, Number(entry.minutes) || 0);
    record.billable = entry.billable === true;
    return record;
  }

  function fileEntryId(dealRoot, date, title, index) {
    return 'journal:' + cleanWorkspace(dealRoot || 'Global') + ':' + text(date) + ':' + encodeKey(title).slice(0, 48) + ':#' + index;
  }

  function sortForFile(entryList) {
    return entryList.slice().sort(function (a, b) {
      return text(a.date).localeCompare(text(b.date)) || text(a.entryId).localeCompare(text(b.entryId));
    });
  }

  function renderMonthFile(dealRoot, month, entryList, tr) {
    var deal = cleanWorkspace(dealRoot);
    var lines = [
      '---',
      'verstak: worklog',
      'version: 1',
      'deal: "' + deal.replace(/"/g, '\\"') + '"',
      'month: ' + text(month),
      '---',
      '',
      '# ' + tr('file.heading', { deal: deal, month: text(month) }, 'Journal — ' + deal + ' — ' + text(month)),
      ''
    ];
    var byDate = {};
    var dates = [];
    sortForFile(entryList).forEach(function (entry) {
      if (!byDate[entry.date]) {
        byDate[entry.date] = [];
        dates.push(entry.date);
      }
      byDate[entry.date].push(entry);
    });
    dates.forEach(function (date) {
      lines.push('## ' + date, '');
      byDate[date].forEach(function (entry) {
        lines.push('### ' + text(entry.title).replace(/\s+/g, ' ').trim(), '');
        lines.push(metaLine(entry, tr), '');
        var body = text(entry.summary).replace(/\r\n/g, '\n').replace(/[ \t\n]+$/, '');
        if (body) {
          body.split('\n').forEach(function (line) { lines.push(escapeBodyLine(line)); });
          lines.push('');
        }
        lines.push(ENTRY_MARK + JSON.stringify(entryRecord(entry)) + ENTRY_MARK_END, '');
      });
    });
    return lines.join('\n').replace(/[ \t\n]+$/, '') + '\n';
  }

  function parseRecord(value) {
    try {
      var parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function finishFileEntry(pending, dealRoot) {
    var record = pending.record || {};
    var bodyLines = pending.bodyLines.slice();
    while (bodyLines.length && !text(bodyLines[0]).trim()) bodyLines.shift();
    var minutes = Math.max(0, Number(record.minutes) || 0);
    var billable = record.billable === true;
    if (bodyLines.length) {
      var meta = META_LINE.exec(text(bodyLines[0]).trim());
      if (meta) {
        minutes = Math.max(0, Number(meta[1]) || 0);
        var word = text(meta[2]).trim().toLowerCase();
        if (NON_BILLABLE_WORDS[word]) billable = false;
        else if (BILLABLE_WORDS[word]) billable = true;
        bodyLines.shift();
      }
    }
    while (bodyLines.length && !text(bodyLines[0]).trim()) bodyLines.shift();
    while (bodyLines.length && !text(bodyLines[bodyLines.length - 1]).trim()) bodyLines.pop();
    return normalizeEntry({
      entryId: text(record.entryId) || fileEntryId(dealRoot, pending.date, pending.title, pending.index),
      workspaceRootPath: cleanWorkspace(dealRoot),
      date: pending.date,
      title: pending.title,
      summary: bodyLines.map(unescapeBodyLine).join('\n'),
      minutes: minutes,
      billable: billable,
      sourceCandidateId: record.sourceCandidateId,
      sourceTodoId: record.sourceTodoId,
      activityIds: record.activityIds
    });
  }

  function parseMonthFile(content, dealRoot, month) {
    var lines = text(content).replace(/\r\n/g, '\n').split('\n');
    var index = 0;
    var start = 0;
    if (lines[0] === '---') {
      var close = lines.indexOf('---', 1);
      if (close > 0) start = close + 1;
    }
    var currentDate = text(month) + '-01';
    var parsed = [];
    var pending = null;
    function flush() {
      if (!pending) return;
      parsed.push(finishFileEntry(pending, dealRoot));
      pending = null;
    }
    for (var i = start; i < lines.length; i += 1) {
      var line = lines[i];
      var titleMatch = /^###\s+(.+?)\s*$/.exec(line);
      if (titleMatch) {
        flush();
        index += 1;
        pending = { date: currentDate, title: titleMatch[1], bodyLines: [], record: null, index: index };
        continue;
      }
      var dateMatch = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/.exec(line);
      if (dateMatch) {
        flush();
        currentDate = dateMatch[1];
        continue;
      }
      if (!pending) continue;
      if (line.indexOf(ENTRY_MARK) === 0 && line.slice(-ENTRY_MARK_END.length) === ENTRY_MARK_END) {
        pending.record = parseRecord(line.slice(ENTRY_MARK.length, line.length - ENTRY_MARK_END.length));
        continue;
      }
      pending.bodyLines.push(line);
    }
    flush();
    return parsed;
  }

  function candidateDate(value) {
    var date = new Date(value || '');
    return isNaN(date.getTime()) ? today() : date.toISOString().slice(0, 10);
  }

  function formatTime(value, locale) {
    var date = new Date(value || '');
    if (isNaN(date.getTime())) return text(value);
    // The engine's own locale is not the one the user chose in Verstak, and a
    // proposal reading "Работа с Jul 20, 2026, 05:00 PM" is what that looks
    // like.
    return date.toLocaleString(locale || undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function normalizeCandidate(value) {
    if (!value || typeof value !== 'object') return null;
    var workspace = cleanWorkspace(value.workspaceRootPath);
    if (!workspace || !text(value.candidateId).trim()) return null;
    var activities = Array.isArray(value.activities) ? value.activities.filter(function (activity) {
      return activity && text(activity.activityId).trim();
    }).map(function (activity) {
      return {
        activityId: text(activity.activityId),
        type: text(activity.type || 'activity.event'),
        occurredAt: text(activity.occurredAt),
        sourcePluginId: text(activity.sourcePluginId),
        url: text(activity.url),
        hostname: text(activity.hostname),
        title: text(activity.title),
        durationSeconds: Math.max(0, Number(activity.durationSeconds) || 0)
      };
    }) : [];
    var activityIds = Array.isArray(value.activityIds) ? value.activityIds.map(text).filter(Boolean) : activities.map(function (activity) { return activity.activityId; });
    if (!activities.length) {
      activities = activityIds.map(function (activityId) {
        return { activityId: activityId, type: 'activity.event', occurredAt: '', sourcePluginId: '' };
      });
    }
    return {
      candidateId: text(value.candidateId),
      sessionId: text(value.sessionId),
      handledThrough: text(value.handledThrough || value.endedAt),
      workspaceRootPath: workspace,
      startedAt: text(value.startedAt),
      endedAt: text(value.endedAt),
      estimatedMinutes: Math.max(0, Number(value.estimatedMinutes || 0)),
      activityCount: Math.max(0, Number(value.activityCount || activities.length)),
      activityIds: activityIds,
      activities: activities,
      breakdown: normalizeBreakdown(value.breakdown),
      // A guess is asked about, never asserted: the Deal came from what the
      // user was doing around the time, not from anything they said.
      guessed: value.guessed === true,
      guessedActivityIds: Array.isArray(value.guessedActivityIds) ? value.guessedActivityIds.map(text).filter(Boolean) : [],
      providerLabel: '',
      providerPluginId: ''
    };
  }

  // What the time went on, by kind of work. A proposal that only says "25 min"
  // leaves the user to remember what those minutes were.
  function normalizeBreakdown(value) {
    if (!Array.isArray(value)) return [];
    return value.map(function (part) {
      return {
        kind: text(part && part.kind) || 'other',
        count: Math.max(0, Number(part && part.count) || 0),
        minutes: Math.max(0, Number(part && part.minutes) || 0),
        sites: Array.isArray(part && part.sites) ? part.sites.map(text).filter(Boolean) : []
      };
    }).filter(function (part) {
      return part.count > 0;
    });
  }

  // A proposal handed over by another tool arrives for the Deal being looked at.
  function candidateFromRequest(request, workspaceRoot) {
    var value = request && request.type === 'work-session-candidate' ? request.candidate : null;
    var candidate = normalizeCandidate(value);
    if (!candidate || candidate.workspaceRootPath !== cleanWorkspace(workspaceRoot)) return null;
    return candidate;
  }

  function completedTodoFromRequest(request, workspaceRoot) {
    var value = request && request.type === 'completed-todo' ? request.todo : null;
    if (!value || typeof value !== 'object') return null;
    var workspace = cleanWorkspace(value.workspaceRootPath);
    var todoId = text(value.id).trim();
    var title = text(value.title).trim();
    if (!todoId || !title || !workspace || workspace !== cleanWorkspace(workspaceRoot)) return null;
    return {
      id: todoId,
      title: title,
      description: text(value.description || value.body),
      workspaceRootPath: workspace,
      completedAt: text(value.completedAt)
    };
  }

  var ICONS = {
    report: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 12h2v3H7v-3zm4-6h2v9h-2V9zm4 3h2v6h-2v-6z',
    download: 'M12 3v10.17l3.59-3.58L17 11l-5 5-5-5 1.41-1.41L11 13.17V3h1zM5 19h14v2H5v-2z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z'
  };

  function iconSvg(name) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.edit) + '" fill="currentColor"/></svg>';
  }

  function JournalView() {}

  JournalView.mount = function (containerEl, props, api) {
    injectStyles();
    containerEl.innerHTML = '';
    containerEl.className = 'journal-root';
    containerEl.setAttribute('data-plugin-id', PLUGIN_ID);

    var scope = scopeFromProps(props || {});
    var entries = [];
    var proposals = [];
    var workspaceOptions = [];
    var workspaceIds = {};
    var lastAnswer = null;
    // Filters over what an entry already records. Nothing here invents a
    // taxonomy: the Deal, whether it is billable and where it came from are
    // all fields the entry carries.
    var filterDeal = '';
    var filterBillable = 'all';
    var filterSource = 'all';
    var filterPeriod = 'all';
    var customFrom = '';
    var customTo = '';
    var mode = 'list';
    function tr(key, params, fallback) {
      if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
      return fallback || key;
    }
    var statusText = tr('ui.loading', null, 'Loading journal...');
    var statusClass = '';
    var modalHost = el('div', { className: 'journal-modal-host', hidden: 'hidden' });

    function candidateTime(value) {
      return formatTime(value, api && api.i18n && typeof api.i18n.getLocale === 'function' ? api.i18n.getLocale() : '');
    }

    function reportError(key, fallback, err) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[verstak.journal] ' + key, err);
      }
      statusText = tr(key, null, fallback);
      statusClass = 'error';
    }

    var toolbar = el('div', { className: 'journal-toolbar' });
    var titleEl = el('span', { className: 'journal-title', textContent: scope.mode === 'global' ? tr('ui.title', null, 'Journal') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Journal · ' + scope.label) });
    var countEl = el('span', { className: 'journal-count' });
    var statusEl = el('span', { className: 'journal-status' });
    var addBtn = el('button', {
      className: 'journal-btn primary',
      'data-journal-action': 'add',
      innerHTML: iconSvg('add') + '<span>' + tr('ui.add', null, 'Add') + '</span>',
      onClick: function () { showEntryModal(); }
    });
    // A worklog answers what was done; this answers what to bill for. Same
    // entries, same filters, counted instead of listed.
    var reportLabelEl = el('span', { 'data-journal-report-label': '', textContent: tr('ui.report.open', null, 'Report') });
    var reportBtn = el('button', {
      className: 'journal-btn',
      type: 'button',
      'data-journal-action': 'toggle-report',
      onClick: function () {
        mode = mode === 'report' ? 'list' : 'report';
        render();
      }
    }, [el('span', { className: 'journal-btn-icon', innerHTML: iconSvg('report') }), reportLabelEl]);
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'journal-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(reportBtn);
    toolbar.appendChild(addBtn);

    // A journal you cannot narrow is a pile. These are the questions actually
    // asked of one: whose Deal, what is billable, and what did I write by hand
    // versus accept from a proposal.
    var filtersEl = el('div', { className: 'journal-filters', 'data-journal-filters': '' });

    function filterSelect(attr, options, current, onPick) {
      // The same select treatment the entry form uses. A bare <select> renders
      // with the platform's own light chrome in WebKitGTK -- white box, white
      // text -- which is what check-select-styles.js exists to prevent.
      var select = el('select', { className: 'journal-input journal-select journal-filter' }, options.map(function (option) {
        return el('option', { value: option.value, selected: option.value === current }, [option.label]);
      }));
      select.setAttribute(attr, '');
      select.value = current;
      select.addEventListener('change', function () { onPick(select.value); });
      return select;
    }

    function buildFilters() {
      filtersEl.innerHTML = '';
      if (scope.mode === 'global') {
        var deals = [{ value: '', label: tr('ui.filter.allDeals', null, 'All Deals') }];
        var seen = {};
        entries.forEach(function (entry) {
          if (!entry.workspaceRootPath || seen[entry.workspaceRootPath]) return;
          seen[entry.workspaceRootPath] = true;
          deals.push({ value: entry.workspaceRootPath, label: entry.workspaceRootPath });
        });
        filtersEl.appendChild(filterSelect('data-journal-filter-deal', deals, filterDeal, function (value) {
          filterDeal = value;
          render();
        }));
      }
      filtersEl.appendChild(filterSelect('data-journal-filter-billable', [
        { value: 'all', label: tr('ui.filter.anyBilling', null, 'Billable and not') },
        { value: 'billable', label: tr('ui.meta.billable', null, 'billable') },
        { value: 'non-billable', label: tr('ui.meta.nonBillable', null, 'non-billable') }
      ], filterBillable, function (value) { filterBillable = value; render(); }));
      filtersEl.appendChild(filterSelect('data-journal-filter-source', [
        { value: 'all', label: tr('ui.filter.anySource', null, 'Any source') },
        { value: 'manual', label: tr('ui.filter.manual', null, 'Written by hand') },
        { value: 'proposal', label: tr('ui.filter.proposal', null, 'From a proposal') },
        { value: 'todo', label: tr('ui.filter.todo', null, 'From a todo') }
      ], filterSource, function (value) { filterSource = value; render(); }));
      // The question a worklog is asked is almost always about a stretch of
      // time: this week, last month, the quarter being invoiced.
      filtersEl.appendChild(filterSelect('data-journal-filter-period', [
        { value: 'all', label: tr('ui.filter.anyPeriod', null, 'All time') },
        { value: 'week', label: tr('ui.filter.thisWeek', null, 'This week') },
        { value: 'month', label: tr('ui.filter.thisMonth', null, 'This month') },
        { value: 'last-month', label: tr('ui.filter.lastMonth', null, 'Last month') },
        { value: 'year', label: tr('ui.filter.thisYear', null, 'This year') },
        { value: 'custom', label: tr('ui.filter.customPeriod', null, 'Exact dates…') }
      ], filterPeriod, function (value) { filterPeriod = value; render(); }));
      if (filterPeriod === 'custom') {
        var fromInput = el('input', { className: 'journal-input journal-filter', type: 'date', value: customFrom, 'data-journal-filter-from': '' });
        fromInput.addEventListener('change', function () { customFrom = fromInput.value; render(); });
        var toInput = el('input', { className: 'journal-input journal-filter', type: 'date', value: customTo, 'data-journal-filter-to': '' });
        toInput.addEventListener('change', function () { customTo = toInput.value; render(); });
        filtersEl.appendChild(fromInput);
        filtersEl.appendChild(toInput);
      }
      filtersEl.appendChild(el('span', { className: 'journal-spacer' }));
      filtersEl.appendChild(el('span', {
        className: 'journal-total',
        'data-journal-total': '',
        textContent: tr('ui.totalMinutes', { minutes: totalMinutes(visibleEntries()) }, totalMinutes(visibleEntries()) + ' min total')
      }));
    }

    var proposalsEl = el('div', { className: 'journal-proposals', 'data-journal-proposals': '', hidden: 'hidden' });
    var listEl = el('div', { className: 'journal-list' });
    var reportEl = el('div', { className: 'journal-list', 'data-journal-report': '', hidden: 'hidden' });
    containerEl.appendChild(toolbar);
    containerEl.appendChild(filtersEl);
    containerEl.appendChild(proposalsEl);
    containerEl.appendChild(listEl);
    containerEl.appendChild(reportEl);
    containerEl.appendChild(modalHost);

    // Saving the journal is the plugin keeping its own records, so the write
    // says so and never turns into a proposal to journal about journalling.
    function serviceWrite() {
      return { createIfMissing: true, overwrite: true, service: true };
    }

    var journalFolderReady = {};
    var migration = { version: 1, deals: {} };

    function ensureFolder(folder) {
      if (!folder || journalFolderReady[folder]) return Promise.resolve();
      if (!api || !api.files || typeof api.files.createFolder !== 'function') return Promise.resolve();
      return api.files.createFolder(folder).catch(function (err) {
        // Already there is the ordinary case after the first entry.
        if (String((err && err.message) || err).indexOf('conflict') === -1) throw err;
      }).then(function () {
        journalFolderReady[folder] = true;
      });
    }

    function ensureJournalFolder(dealRoot) {
      return ensureFolder(journalFolderPath(dealRoot));
    }

    function readDealEntries(dealRoot) {
      var deal = cleanWorkspace(dealRoot);
      if (!deal || !api || !api.files || typeof api.files.list !== 'function' || typeof api.files.readText !== 'function') {
        return Promise.resolve([]);
      }
      return api.files.list(journalFolderPath(deal)).then(function (found) {
        var months = (Array.isArray(found) ? found : []).map(function (item) {
          if (!item || item.type === 'folder') return null;
          var match = MONTH_FILE.exec(text(item.name));
          return match ? { month: match[1], path: text(item.relativePath) } : null;
        }).filter(Boolean);
        return Promise.all(months.map(function (item) {
          return api.files.readText(item.path).then(function (content) {
            return parseMonthFile(content, deal, item.month);
          }).catch(function (err) {
            console.warn('[verstak.journal] read ' + item.path + ':', err);
            return [];
          });
        }));
      }).then(function (lists) {
        var all = [];
        lists.forEach(function (list) { all = all.concat(list); });
        return all;
      }).catch(function () {
        // A Deal nobody has journalled in has no journal folder, which is not
        // an error and must not be reported as one.
        return [];
      });
    }

    function writeMonths(dealRoot, months, entryList) {
      var deal = cleanWorkspace(dealRoot);
      var wanted = {};
      (months || []).forEach(function (month) { if (month) wanted[month] = true; });
      var targets = Object.keys(wanted).sort();
      if (!deal || !targets.length) return Promise.resolve();
      if (!api || !api.files || typeof api.files.writeText !== 'function') return Promise.resolve();
      var list = entryList || entries;
      return ensureJournalFolder(deal).then(function () {
        return targets.reduce(function (chain, month) {
          return chain.then(function () {
            var forMonth = list.filter(function (entry) {
              return cleanWorkspace(entry.workspaceRootPath) === deal && monthOf(entry.date) === month;
            });
            return api.files.writeText(monthFilePath(deal, month), renderMonthFile(deal, month, forMonth, tr), serviceWrite());
          });
        }, Promise.resolve());
      });
    }

    function persist(workspaceRoot, months, values) {
      return writeMonths(workspaceRoot, months, values).catch(function (err) {
        reportError('ui.saveError', 'Could not save journal. Please try again.', err);
      });
    }

    function normalizeMigration(value) {
      var stored = value && typeof value === 'object' && value.deals && typeof value.deals === 'object' ? value.deals : {};
      var deals = {};
      Object.keys(stored).forEach(function (key) { deals[key] = text(stored[key]); });
      return { version: 1, deals: deals };
    }

    function rememberMigration(dealRoot) {
      migration.deals[cleanWorkspace(dealRoot)] = new Date().toISOString();
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      return api.settings.write(MIGRATION_KEY, migration).catch(function (err) {
        console.warn('[verstak.journal] record worklog migration:', err);
      });
    }

    // Worklogs written before this version are in plugin settings. They are
    // copied into the Deal once; the settings copy is left exactly where it is,
    // because deleting the only other copy to make a migration look tidy is how
    // people lose a year of billing.
    function migrateDeal(dealRoot, settings, vaultEntries) {
      var deal = cleanWorkspace(dealRoot);
      if (!deal || migration.deals[deal]) return Promise.resolve(vaultEntries);
      var key = WORKLOG_PREFIX + encodeKey(deal);
      var stored = normalizeEntries(settings[key], key).map(function (entry) {
        entry.workspaceRootPath = deal;
        return entry;
      });
      if (!stored.length) return rememberMigration(deal).then(function () { return vaultEntries; });
      var known = {};
      vaultEntries.forEach(function (entry) { known[entry.entryId] = true; });
      var missing = stored.filter(function (entry) { return !known[entry.entryId]; });
      var merged = sortEntries(vaultEntries.concat(missing));
      if (!missing.length) return rememberMigration(deal).then(function () { return merged; });
      var months = {};
      merged.forEach(function (entry) { months[monthOf(entry.date)] = true; });
      return writeMonths(deal, Object.keys(months), merged).then(function () {
        return rememberMigration(deal);
      }).then(function () {
        return merged;
      }).catch(function (err) {
        // The old copy is still there and the entries are on screen. Saying
        // nothing louder than a warning keeps a failed copy from reading like
        // lost work.
        console.warn('[verstak.journal] move worklog of ' + deal + ' into the Deal:', err);
        return merged;
      });
    }

    // Every Deal this Journal has to speak for: the ones that exist, plus any
    // named by a worklog written before the move into the vault.
    function dealsInScope(settings) {
      if (scope.mode === 'workspace') return scope.workspaceRoot ? [scope.workspaceRoot] : [];
      var seen = {};
      var deals = [];
      workspaceOptions.concat(worklogKeys(settings).map(decodeWorkspaceKey)).forEach(function (deal) {
        var target = cleanWorkspace(deal);
        if (!target || seen[target]) return;
        seen[target] = true;
        deals.push(target);
      });
      return deals;
    }

    // Deals, not folders. Listing the vault root offered every top-level
    // folder whether or not it was a Deal, and hid every Deal inside one --
    // which is where most of them are.
    function loadWorkspaceOptions() {
      if (!api || !api.workspaces || typeof api.workspaces.list !== 'function') return Promise.resolve();
      return api.workspaces.list().then(function (entries) {
        var seen = {};
        workspaceIds = {};
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
          var root = cleanWorkspace(entry && entry.rootPath);
          if (root && entry && entry.id) workspaceIds[root] = text(entry.id);
        });
        workspaceOptions = (Array.isArray(entries) ? entries : []).map(function (entry) {
          return cleanWorkspace(entry && entry.rootPath);
        }).filter(function (workspaceRoot) {
          if (!workspaceRoot || seen[workspaceRoot]) return false;
          seen[workspaceRoot] = true;
          return true;
        }).sort(function (a, b) {
          return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });
      }).catch(function (err) {
        workspaceOptions = [];
        console.warn('[verstak.journal] list Deals:', err);
      });
    }

    function loadStored() {
      var readSettings = api && api.settings && typeof api.settings.read === 'function'
        ? api.settings.read()
        : Promise.resolve({});
      return readSettings.then(function (stored) {
        var settings = stored || {};
        migration = normalizeMigration(settings[MIGRATION_KEY]);
        var deals = dealsInScope(settings);
        // One Deal at a time: a migration writes files, and a dozen Deals
        // migrating at once is a dozen interleaved writes into the same vault.
        return deals.reduce(function (chain, deal) {
          return chain.then(function (collected) {
            return readDealEntries(deal).then(function (found) {
              return migrateDeal(deal, settings, found);
            }).then(function (dealEntries) {
              return collected.concat(dealEntries);
            });
          });
        }, Promise.resolve([]));
      }).then(function (all) {
        entries = sortEntries(all);
        statusText = scope.mode === 'global'
          ? tr('ui.aggregating', null, 'Aggregating worklogs')
          : tr('ui.ready', null, 'Ready');
        statusClass = '';
      }).catch(function (err) {
        reportError('ui.loadError', 'Could not load journal. Please try again.', err);
      });
    }

    // Proposals come from whoever declares a worklogProviders contribution --
    // today Activity, tomorrow possibly something else. The Journal asks; it
    // does not reimplement anyone's idea of what a work session was.
    function loadProposals() {
      if (!api || !api.contributions || typeof api.contributions.list !== 'function') return Promise.resolve();
      if (!api.commands || typeof api.commands.executeFor !== 'function') return Promise.resolve();
      return api.contributions.list('worklogProviders').then(function (providers) {
        return Promise.all((Array.isArray(providers) ? providers : []).filter(function (provider) {
          return provider && provider.pluginId && provider.handler && provider.pluginId !== PLUGIN_ID;
        }).map(function (provider) {
          return api.commands.executeFor(provider.pluginId, provider.handler, {
            workspaceRootPath: scope.mode === 'workspace' ? scope.workspaceRoot : ''
          }).then(function (response) {
            var result = response && response.result;
            var list = result && Array.isArray(result.candidates) ? result.candidates : [];
            return list.map(normalizeCandidate).filter(Boolean).map(function (candidate) {
              candidate.providerLabel = text(provider.label);
              candidate.providerPluginId = text(provider.pluginId);
              return candidate;
            });
          }).catch(function (err) {
            console.warn('[verstak.journal] proposals from ' + provider.pluginId + ':', err);
            return [];
          });
        }));
      }).then(function (lists) {
        var all = [];
        lists.forEach(function (list) { all = all.concat(list); });
        proposals = all.sort(function (a, b) {
          return text(b.endedAt).localeCompare(text(a.endedAt)) || text(a.workspaceRootPath).localeCompare(text(b.workspaceRootPath));
        });
      }).catch(function (err) {
        console.warn('[verstak.journal] list proposal providers:', err);
      });
    }

    function closeEntryModal() {
      modalHost.innerHTML = '';
      modalHost.setAttribute('hidden', 'hidden');
    }

    function activityLabel(activity) {
      var type = text(activity && activity.type);
      var labels = {
        'browser.capture.link': ['ui.activity.captureLink', 'Link captured'],
        'browser.capture.selection': ['ui.activity.captureSelection', 'Selection captured'],
        'browser.capture.page': ['ui.activity.capturePage', 'Page captured'],
        'file.created': ['ui.activity.fileCreated', 'File created'],
        'file.updated': ['ui.activity.fileUpdated', 'File updated'],
        // What the file watcher actually emits; without it every recorded file
        // change read as a nameless "Activity".
        'file.changed': ['ui.activity.fileUpdated', 'File updated'],
        'file.deleted': ['ui.activity.fileDeleted', 'File deleted'],
        'note.saved': ['ui.activity.noteSaved', 'Note saved'],
        'workspace.created': ['ui.activity.dealCreated', 'Deal created'],
        'workspace.renamed': ['ui.activity.dealRenamed', 'Deal renamed']
      };
      // Browser time is named by the page it was spent on: "Activity" repeated
      // three times tells the user nothing about what they are agreeing to.
      if (type === 'browser.activity.domain') {
        var address = text(activity && (activity.url || activity.hostname)).trim();
        if (address) return address;
      }
      var label = labels[type] || ['ui.activity.generic', 'Activity'];
      return tr(label[0], null, label[1]);
    }

    // Where an entry came from. Derived, not stored: an entry made from a work
    // session proposal carries its candidate id, one made from a finished todo
    // carries the todo id, and anything else was typed by hand.
    function entrySource(entry) {
      if (entry.sourceCandidateId) return 'proposal';
      if (entry.sourceTodoId) return 'todo';
      return 'manual';
    }

    function currentRange() {
      return periodRange(filterPeriod, customFrom, customTo);
    }

    function visibleEntries() {
      var range = currentRange();
      return entries.filter(function (entry) {
        if (filterDeal && entry.workspaceRootPath !== filterDeal) return false;
        if (filterBillable === 'billable' && !entry.billable) return false;
        if (filterBillable === 'non-billable' && entry.billable) return false;
        if (filterSource !== 'all' && entrySource(entry) !== filterSource) return false;
        if (!inRange(entry.date, range)) return false;
        return true;
      });
    }

    function totalMinutes(list) {
      return list.reduce(function (sum, entry) { return sum + Math.max(0, Number(entry.minutes) || 0); }, 0);
    }

    function visibleProposals() {
      // A proposal is not an entry yet: it was written by nobody and billed to
      // nothing, so the filters that ask about those take it out of view.
      if (filterSource === 'manual' || filterSource === 'todo') return [];
      if (filterBillable !== 'all') return [];
      return proposals.filter(function (candidate) {
        if (filterDeal && candidate.workspaceRootPath !== filterDeal) return false;
        return !entries.some(function (entry) { return entry.sourceCandidateId === candidate.candidateId; });
      });
    }

    function entryMeta(entry) {
      var facts = [entry.workspaceRootPath, entry.billable ? tr('ui.meta.billable', null, 'billable') : tr('ui.meta.nonBillable', null, 'non-billable')];
      if (entry.activityIds.length) {
        facts.push(tr(entry.activityIds.length === 1 ? 'ui.meta.activities.one' : 'ui.meta.activities.many', { count: entry.activityIds.length }, entry.activityIds.length + ' linked activities'));
      }
      if (entry.sourceTodoId) facts.push(tr('ui.meta.todo', null, 'linked todo'));
      return facts.join(' · ');
    }

    function showEntryModal(existingEntry, candidate, completedTodo) {
      var editing = !!existingEntry;
      var reviewingCandidate = !editing && !!candidate;
      var reviewingTodo = !editing && !!completedTodo;
      var dateInput = el('input', { className: 'journal-input', type: 'date', value: editing ? existingEntry.date : (reviewingCandidate ? candidateDate(candidate.startedAt) : (reviewingTodo ? candidateDate(completedTodo.completedAt) : today())), 'data-journal-input': 'date' });
      var titleInput = el('input', { className: 'journal-input', type: 'text', placeholder: tr('ui.workItem', null, 'Work item'), value: editing ? existingEntry.title : (reviewingTodo ? completedTodo.title : ''), 'data-journal-input': 'title' });
      var summaryInput = el('textarea', { className: 'journal-input textarea', placeholder: tr('ui.body', null, 'Body'), 'data-journal-input': 'summary' });
      // A proposal arrives with what the time went on already written out. The
      // title stays empty: only the user knows what the work was for.
      summaryInput.value = editing
        ? existingEntry.summary
        : (reviewingTodo ? completedTodo.description : (reviewingCandidate ? breakdownSentence(candidate) : ''));
      var minutesInput = el('input', { className: 'journal-input', type: 'number', min: '0', step: '1', value: editing ? existingEntry.minutes : (reviewingCandidate ? candidate.estimatedMinutes : (reviewingTodo ? '0' : '30')), 'data-journal-input': 'minutes' });
      var billableInput = el('input', { type: 'checkbox', 'data-journal-input': 'billable' });
      billableInput.checked = editing ? existingEntry.billable === true : false;
      var workspaceInput = null;
      if (scope.mode === 'global') {
        workspaceInput = el('select', { className: 'journal-input journal-select', 'data-journal-input': 'workspaceRootPath' });
        // Whatever the entry or proposal already belongs to must be selectable
        // even if the Deal folder listing did not turn it up.
        var known = (editing && existingEntry.workspaceRootPath)
          || (reviewingCandidate && candidate.workspaceRootPath)
          || (reviewingTodo && completedTodo.workspaceRootPath)
          || '';
        var options = workspaceOptions.slice();
        if (known && options.indexOf(known) === -1) options.unshift(known);
        options.forEach(function (workspace) {
          workspaceInput.appendChild(el('option', { value: workspace, textContent: workspace }));
        });
        if (known) workspaceInput.value = known;
      }
      var activityInputs = reviewingCandidate ? candidate.activities.map(function (activity) {
        var input = el('input', { type: 'checkbox', value: activity.activityId, checked: 'checked', 'data-journal-candidate-activity': activity.activityId });
        input.checked = true;
        return { input: input, activity: activity };
      }) : [];

      function saveEntry() {
        addOrUpdateEntry(existingEntry, {
          date: dateInput.value || today(),
          title: titleInput.value,
          summary: summaryInput.value,
          minutes: minutesInput.value,
          billable: billableInput.checked === true,
          workspaceRootPath: workspaceInput ? workspaceInput.value : scope.workspaceRoot,
          sourceCandidateId: reviewingCandidate ? candidate.candidateId : (existingEntry ? existingEntry.sourceCandidateId : ''),
          sessionId: reviewingCandidate ? candidate.sessionId : '',
          handledThrough: reviewingCandidate ? candidate.handledThrough : '',
          sourceTodoId: reviewingTodo ? completedTodo.id : (existingEntry ? existingEntry.sourceTodoId : ''),
          activityIds: reviewingCandidate
            ? activityInputs.filter(function (item) { return item.input.checked === true; }).map(function (item) { return item.activity.activityId; })
            : (existingEntry ? existingEntry.activityIds : [])
        });
      }

      var candidateContext = reviewingCandidate ? el('div', { className: 'journal-candidate-context', 'data-journal-candidate': candidate.candidateId }, [
        el('strong', { textContent: tr('ui.candidate.title', null, 'Possible journal entry') }),
        el('div', { textContent: tr('ui.candidate.deal', { deal: candidate.workspaceRootPath }, 'Deal: ' + candidate.workspaceRootPath) }),
        el('div', { textContent: tr('ui.candidate.time', { start: candidateTime(candidate.startedAt), end: candidateTime(candidate.endedAt) }, 'Time: ' + candidateTime(candidate.startedAt) + ' – ' + candidateTime(candidate.endedAt)) }),
        el('div', { textContent: tr('ui.candidate.duration', { minutes: candidate.estimatedMinutes }, 'Estimated duration: ' + candidate.estimatedMinutes + ' min') }),
        el('div', { textContent: tr('ui.candidate.activities', { count: candidate.activityCount }, 'Activities: ' + candidate.activityCount) })
      ]) : null;
      var candidateActivities = reviewingCandidate ? el('fieldset', { className: 'journal-candidate-activities' }, [
        el('legend', { textContent: tr('ui.candidate.linkedActivities', null, 'Linked activities') })
      ].concat(activityInputs.map(function (item) {
        // Time, what it was, and how long it took. A row that says only the
        // time leaves the user ticking boxes with no idea what is in them.
        var minutes = Math.round(Math.max(0, Number(item.activity.durationSeconds) || 0) / 60);
        var detail = [
          item.activity.occurredAt ? candidateTime(item.activity.occurredAt) : '',
          activityLabel(item.activity),
          minutes > 0 ? tr('ui.minutesValue', { minutes: minutes }, minutes + ' min') : ''
        ].filter(Boolean).join(' · ');
        return el('label', { className: 'journal-candidate-activity' }, [item.input, detail]);
      }))) : null;
      var todoContext = reviewingTodo ? el('div', { className: 'journal-candidate-context', 'data-journal-todo': completedTodo.id }, [
        el('strong', { textContent: tr('ui.todo.title', null, 'Completed todo') }),
        el('div', { textContent: tr('ui.candidate.deal', { deal: completedTodo.workspaceRootPath }, 'Deal: ' + completedTodo.workspaceRootPath) }),
        completedTodo.completedAt ? el('div', { textContent: tr('ui.todo.completed', { time: candidateTime(completedTodo.completedAt) }, 'Completed: ' + candidateTime(completedTodo.completedAt)) }) : null
      ]) : null;

      modalHost.innerHTML = '';
      if (typeof modalHost.removeAttribute === 'function') modalHost.removeAttribute('hidden');
      else delete modalHost.attributes.hidden;
      modalHost.appendChild(el('div', { className: 'journal-modal-overlay', onClick: function (event) {
        if (event.target === event.currentTarget) closeEntryModal();
      } }, [
        el('div', { className: 'journal-modal' }, [
          el('div', { className: 'journal-modal-title', textContent: editing ? tr('ui.editEntry', null, 'Edit journal entry') : (reviewingCandidate ? tr('ui.reviewCandidate', null, 'Review possible journal entry') : (reviewingTodo ? tr('ui.fromTodo', null, 'Create journal entry from completed todo') : tr('ui.addEntry', null, 'Add journal entry'))) }),
          candidateContext,
          todoContext,
          el('div', { className: 'journal-modal-grid' }, [
            el('label', { className: 'journal-field' }, [tr('ui.date', null, 'Date'), dateInput]),
            el('label', { className: 'journal-field' }, [tr('ui.minutes', null, 'Minutes'), minutesInput]),
            workspaceInput ? el('label', { className: 'journal-field wide' }, [tr('ui.workspace', null, 'Deal'), workspaceInput]) : null,
            el('label', { className: 'journal-field wide' }, [tr('ui.fieldTitle', null, 'Title'), titleInput]),
            el('label', { className: 'journal-field wide' }, [tr('ui.body', null, 'Body'), summaryInput]),
            el('label', { className: 'journal-billable' }, [billableInput, tr('ui.billable', null, 'Billable')])
          ]),
          candidateActivities,
          el('div', { className: 'journal-modal-actions' }, [
            el('button', { className: 'journal-btn ghost', type: 'button', textContent: tr('ui.cancel', null, 'Cancel'), onClick: closeEntryModal }),
            el('button', { className: 'journal-btn primary', type: 'button', 'data-journal-action': 'save-entry', textContent: editing ? tr('ui.saveChanges', null, 'Save changes') : tr('ui.addEntryShort', null, 'Add entry'), onClick: saveEntry })
          ])
        ])
      ]));
      titleInput.focus && titleInput.focus();
    }

    function addOrUpdateEntry(existingEntry, formValue) {
      var title = text(formValue && formValue.title).trim();
      if (!title) {
        statusText = tr('ui.titleRequired', null, 'Title is required');
        statusClass = 'error';
        render();
        return;
      }
      var workspaceRoot = cleanWorkspace(formValue && formValue.workspaceRootPath || scope.workspaceRoot);
      if (!workspaceRoot) return;
      var sourceCandidateId = text(formValue && formValue.sourceCandidateId || (existingEntry && existingEntry.sourceCandidateId)).trim();
      var sessionID = text(formValue && formValue.sessionId).trim();
      var handledThrough = text(formValue && formValue.handledThrough).trim();
      var sourceTodoId = text(formValue && formValue.sourceTodoId || (existingEntry && existingEntry.sourceTodoId)).trim();
      if (!existingEntry && sourceCandidateId && entries.some(function (entry) { return entry.sourceCandidateId === sourceCandidateId; })) {
        statusText = tr('ui.candidate.duplicate', null, 'A journal entry already references this candidate');
        statusClass = 'error';
        render();
        return;
      }
      if (!existingEntry && sourceTodoId && entries.some(function (entry) { return entry.sourceTodoId === sourceTodoId; })) {
        statusText = tr('ui.todo.duplicate', null, 'A journal entry already references this todo');
        statusClass = 'error';
        render();
        return;
      }
      var entry = normalizeEntry({
        entryId: existingEntry ? existingEntry.entryId : entryId(workspaceRoot, formValue.date || today(), title),
        workspaceRootPath: workspaceRoot,
        date: formValue.date || today(),
        title: title,
        summary: formValue.summary,
        minutes: Number(formValue.minutes || 0),
        billable: formValue.billable === true,
        sourceCandidateId: sourceCandidateId,
        sourceTodoId: sourceTodoId,
        activityIds: Array.isArray(formValue.activityIds) ? formValue.activityIds : (existingEntry ? existingEntry.activityIds : [])
      }, scope.key);
      if (existingEntry) {
        entries = entries.map(function (item) {
          return item.entryId === existingEntry.entryId ? entry : item;
        });
      } else {
        entries = [entry].concat(entries);
      }
      entries = sortEntries(entries);
      // Only the months that changed are rewritten. A Deal journalled in for
      // three years has thirty-six files, and saving one entry is not a reason
      // to rewrite all of them.
      var previousMonth = existingEntry ? monthOf(existingEntry.date) : '';
      var months = [monthOf(entry.date)];
      if (previousMonth && previousMonth !== months[0]) months.push(previousMonth);
      // Moving an entry to another Deal has to empty its old home too, or the
      // global list shows it twice.
      var previousRoot = existingEntry ? cleanWorkspace(existingEntry.workspaceRootPath) : '';
      var moved = previousRoot && previousRoot !== workspaceRoot;
      closeEntryModal();
      statusText = existingEntry ? tr('ui.updated', null, 'Entry updated') : tr('ui.added', null, 'Entry added');
      statusClass = '';
      persist(workspaceRoot, months, entries).then(function () {
        if (!moved) return undefined;
        return persist(previousRoot, [previousMonth || monthOf(entry.date)], entries);
      }).then(function () {
        if (!sessionID || !handledThrough || !api || !api.events || typeof api.events.publish !== 'function') return undefined;
        return api.events.publish('activity.session.handled', {
          sessionId: sessionID,
          handledThrough: handledThrough,
          status: 'accepted'
        });
      }).then(render);
    }

    function deleteEntry(entry) {
      if (!entry) return;
      // An entry is stored under its own Deal, which in the global Journal is
      // not the one being looked at. Deleting used to write back the current
      // scope, so in the global list the button did nothing at all.
      var workspaceRoot = cleanWorkspace(entry.workspaceRootPath || scope.workspaceRoot);
      if (!workspaceRoot) return;
      entries = entries.filter(function (item) { return item.entryId !== entry.entryId; });
      statusText = tr('ui.deleted', null, 'Entry deleted');
      statusClass = '';
      persist(workspaceRoot, [monthOf(entry.date)], entries).then(render);
    }

    var BREAKDOWN_FALLBACKS = {
      browser: 'browser ({count})',
      capture: 'saved from the browser ({count})',
      note: 'notes ({count})',
      file: 'files ({count})',
      deal: 'work on the Deal ({count})',
      other: 'other ({count})'
    };

    function breakdownClause(part) {
      var fallback = BREAKDOWN_FALLBACKS[part.kind] || BREAKDOWN_FALLBACKS.other;
      var what = part.kind === 'browser' && part.sites.length
        ? tr('ui.breakdown.browserSites', { sites: part.sites.join(', ') }, 'browser: ' + part.sites.join(', '))
        : tr('ui.breakdown.' + part.kind, { count: part.count }, fallback.replace('{count}', part.count));
      if (part.minutes <= 0) return what;
      return tr('ui.breakdown.withTime', { what: what, minutes: part.minutes }, what + ' — ' + part.minutes + ' min');
    }

    // The sentence a person would write about this stretch of work, from the
    // facts the proposal carries and nothing invented.
    function breakdownSentence(candidate) {
      var clauses = (candidate.breakdown || []).map(breakdownClause).filter(Boolean);
      var total = tr('ui.breakdown.total', { minutes: candidate.estimatedMinutes }, candidate.estimatedMinutes + ' min in total');
      if (!clauses.length) return total;
      return clauses.join('; ') + '. ' + total + '.';
    }

    // Answering teaches: the Deal for these pages, and a rule for the address
    // so the same question is not asked again tomorrow.
    function answerProposal(candidate, decision) {
      if (!api || !api.commands || typeof api.commands.executeFor !== 'function') return Promise.resolve();
      var ids = candidate.guessedActivityIds.length ? candidate.guessedActivityIds : candidate.activityIds;
      return api.commands.executeFor(ACTIVITY_PLUGIN_ID, ASSIGN_ACTIVITY_COMMAND, {
        activityIds: ids,
        workspaceRootPath: decision.notWork ? '' : decision.workspaceRootPath,
        workspaceId: decision.notWork ? '' : decision.workspaceId,
        notWork: decision.notWork === true,
        assignedBy: 'user'
      }).then(function () {
        return Promise.all(proposalAddresses(candidate).map(function (address) {
          return api.commands.executeFor(ACTIVITY_PLUGIN_ID, SET_RULE_COMMAND, {
            pattern: address,
            workspaceRootPath: decision.notWork ? '' : decision.workspaceRootPath,
            workspaceId: decision.notWork ? '' : decision.workspaceId,
            notWork: decision.notWork === true,
            createdBy: 'user'
          }).catch(function (err) {
            console.warn('[verstak.journal] teach rule for ' + address + ':', err);
          });
        }));
      }).then(function () {
        lastAnswer = { candidate: candidate, ids: ids };
        statusText = decision.notWork
          ? tr('ui.proposals.markedNotWork', null, 'Marked as not work')
          : tr('ui.proposals.answered', { deal: decision.workspaceRootPath }, 'Attached to ' + decision.workspaceRootPath);
        statusClass = '';
        return loadProposals();
      }).then(render).catch(function (err) {
        reportError('ui.proposals.answerError', 'Could not save that answer. Please try again.', err);
      });
    }

    // The addresses this proposal is made of, so the answer becomes a rule
    // about them rather than about this one stretch of time.
    function proposalAddresses(candidate) {
      var seen = {};
      var addresses = [];
      // The pages themselves, not the sites they are on. Teaching a whole site
      // from one page would quietly claim every other page on it.
      (candidate.activities || []).forEach(function (activity) {
        var address = text(activity && activity.url).trim();
        if (!address || seen[address]) return;
        seen[address] = true;
        addresses.push(address);
      });
      return addresses;
    }

    function confirmProposal(candidate) {
      return answerProposal(candidate, {
        workspaceRootPath: candidate.workspaceRootPath,
        workspaceId: candidate.workspaceId,
        notWork: false
      }).then(function () {
        showEntryModal(null, Object.assign({}, candidate, { guessed: false }));
      });
    }

    function rejectProposal(candidate) {
      return answerProposal(candidate, { notWork: true });
    }

    function showProposalDealPicker(candidate) {
      var select = el('select', { className: 'journal-input journal-select', 'data-journal-proposal-deal': '' },
        workspaceOptions.map(function (workspace) {
          return el('option', { value: workspace, textContent: workspace });
        }));
      select.value = candidate.workspaceRootPath;
      modalHost.innerHTML = '';
      if (typeof modalHost.removeAttribute === 'function') modalHost.removeAttribute('hidden');
      else delete modalHost.attributes.hidden;
      modalHost.appendChild(el('div', { className: 'journal-modal-overlay', onClick: function (event) {
        if (event.target === event.currentTarget) closeEntryModal();
      } }, [
        el('div', { className: 'journal-modal' }, [
          el('div', { className: 'journal-modal-title', textContent: tr('ui.proposals.pickDeal', null, 'Which Deal was this?') }),
          el('div', { className: 'journal-candidate-context' }, [
            el('div', { textContent: breakdownSentence(candidate) })
          ]),
          el('label', { className: 'journal-field wide' }, [tr('ui.workspace', null, 'Deal'), select]),
          el('div', { className: 'journal-modal-actions' }, [
            el('button', { className: 'journal-btn ghost', type: 'button', textContent: tr('ui.cancel', null, 'Cancel'), onClick: closeEntryModal }),
            el('button', {
              className: 'journal-btn primary',
              type: 'button',
              'data-journal-action': 'save-proposal-deal',
              textContent: tr('ui.proposals.attachHere', null, 'Attach here'),
              onClick: function () {
                var chosen = cleanWorkspace(select.value);
                closeEntryModal();
                if (!chosen) return;
                answerProposal(candidate, {
                  workspaceRootPath: chosen,
                  workspaceId: workspaceIds[chosen] || '',
                  notWork: false
                });
              }
            })
          ])
        ])
      ]));
    }

    function proposalMeta(candidate) {
      var facts = [candidate.workspaceRootPath];
      if (candidate.activityCount) {
        facts.push(tr(candidate.activityCount === 1 ? 'ui.meta.activities.one' : 'ui.meta.activities.many', { count: candidate.activityCount }, candidate.activityCount + ' linked activities'));
      }
      if (candidate.providerLabel) facts.push(candidate.providerLabel);
      return facts.join(' · ');
    }

    function renderProposals() {
      proposalsEl.innerHTML = '';
      var shown = visibleProposals();
      if (!shown.length) {
        proposalsEl.setAttribute('hidden', 'hidden');
        return;
      }
      if (typeof proposalsEl.removeAttribute === 'function') proposalsEl.removeAttribute('hidden');
      proposalsEl.appendChild(el('div', {
        className: 'journal-proposals-title',
        'data-journal-proposal-count': String(shown.length),
        textContent: tr(shown.length === 1 ? 'ui.proposals.one' : 'ui.proposals.many', { count: shown.length }, shown.length + ' possible entries')
      }));
      shown.forEach(function (candidate) {
        proposalsEl.appendChild(el('div', {
          className: 'journal-proposal',
          'data-journal-proposal': candidate.candidateId
        }, [
          el('div', { className: 'journal-main' }, [
            el('div', {
              className: 'journal-entry-title',
              textContent: tr('ui.proposals.rowTitle', {
                start: candidateTime(candidate.startedAt),
                end: candidateTime(candidate.endedAt)
              }, 'Work between ' + candidateTime(candidate.startedAt) + ' and ' + candidateTime(candidate.endedAt))
            }),
            candidate.breakdown.length
              ? el('div', { className: 'journal-summary', 'data-journal-proposal-breakdown': '', textContent: breakdownSentence(candidate) })
              : null,
            el('div', { className: 'journal-meta', textContent: proposalMeta(candidate) })
          ]),
          el('div', { className: 'journal-minutes', textContent: tr('ui.minutesValue', { minutes: candidate.estimatedMinutes }, candidate.estimatedMinutes + ' min') }),
          el('div', { className: 'journal-proposal-actions' }, candidate.guessed ? [
            el('button', {
              className: 'journal-btn primary',
              type: 'button',
              'data-journal-action': 'confirm-guess',
              textContent: tr('ui.proposals.confirmDeal', { deal: candidate.workspaceRootPath }, 'Yes, ' + candidate.workspaceRootPath),
              onClick: function () { confirmProposal(candidate); }
            }),
            el('button', {
              className: 'journal-btn',
              type: 'button',
              'data-journal-action': 'reassign-guess',
              textContent: tr('ui.proposals.otherDeal', null, 'Another Deal…'),
              onClick: function () { showProposalDealPicker(candidate); }
            }),
            el('button', {
              className: 'journal-btn',
              type: 'button',
              'data-journal-action': 'not-work',
              textContent: tr('ui.proposals.notWork', null, 'Not work'),
              onClick: function () { rejectProposal(candidate); }
            })
          ] : [
            el('button', {
              className: 'journal-btn',
              type: 'button',
              'data-journal-action': 'review-proposal',
              textContent: tr('ui.proposals.review', null, 'Review'),
              onClick: function () { showEntryModal(null, candidate); }
            })
          ])
        ]));
      });
    }

    // A report for one Deal belongs beside that Deal's journal; one that spans
    // Deals belongs to nobody in particular, so it goes to the vault's own
    // reports folder.
    function reportTargetFolder() {
      return scope.mode === 'workspace' && scope.workspaceRoot
        ? journalFolderPath(scope.workspaceRoot)
        : REPORTS_FOLDER;
    }

    function exportReport(format) {
      var report = buildReport(visibleEntries());
      if (!report.total.count) return Promise.resolve();
      if (!api || !api.files || typeof api.files.writeText !== 'function') return Promise.resolve();
      var folder = reportTargetFolder();
      var range = currentRange();
      var path = folder + '/' + reportFileName(report, range) + (format === 'csv' ? '.csv' : '.md');
      var content = format === 'csv' ? reportCsv(report, tr) : reportMarkdown(report, range, tr);
      return ensureFolder(folder).then(function () {
        // The report is a document the user asked for, not the plugin keeping
        // its own records, so this write is not marked as bookkeeping.
        return api.files.writeText(path, content, { createIfMissing: true, overwrite: true });
      }).then(function () {
        statusText = tr('ui.report.saved', { path: path }, 'Saved to ' + path);
        statusClass = '';
        render();
        if (!api.workbench || typeof api.workbench.openResource !== 'function') return undefined;
        return api.workbench.openResource({ kind: 'vault-file', path: path, mode: 'view' }).catch(function (err) {
          console.warn('[verstak.journal] open the report:', err);
        });
      }).catch(function (err) {
        reportError('ui.report.saveError', 'Could not save the report. Please try again.', err);
        render();
      });
    }

    function reportFigure(labelKey, labelFallback, minutes, attr) {
      var figure = el('div', { className: 'journal-report-figure' }, [
        el('div', { className: 'journal-report-figure-label', textContent: tr(labelKey, null, labelFallback) }),
        el('div', { className: 'journal-report-figure-value', textContent: formatDuration(minutes, tr) })
      ]);
      figure.setAttribute(attr, String(Math.max(0, Math.round(Number(minutes) || 0))));
      return figure;
    }

    function renderReport() {
      reportEl.innerHTML = '';
      var range = currentRange();
      var report = buildReport(visibleEntries());
      var span = reportSpan(report, range);
      var exportBtns = el('div', { className: 'journal-report-actions' }, [
        el('button', {
          className: 'journal-btn',
          type: 'button',
          'data-journal-action': 'export-markdown',
          disabled: report.total.count ? null : 'disabled',
          innerHTML: iconSvg('download') + '<span>' + tr('ui.report.exportMarkdown', null, 'Save as Markdown') + '</span>',
          onClick: function () { exportReport('markdown'); }
        }),
        el('button', {
          className: 'journal-btn',
          type: 'button',
          'data-journal-action': 'export-csv',
          disabled: report.total.count ? null : 'disabled',
          innerHTML: iconSvg('download') + '<span>' + tr('ui.report.exportCsv', null, 'Save as CSV') + '</span>',
          onClick: function () { exportReport('csv'); }
        })
      ]);
      reportEl.appendChild(el('div', { className: 'journal-report-head' }, [
        el('div', { className: 'journal-report-span', 'data-journal-report-span': '', textContent: report.total.count
          ? tr('ui.report.span', { from: span.from || '…', to: span.to || '…' }, (span.from || '…') + ' — ' + (span.to || '…'))
          : tr('ui.report.empty', null, 'Nothing recorded for this period.') }),
        el('div', { className: 'journal-report-figures' }, [
          reportFigure('ui.report.total', 'Total', report.total.minutes, 'data-journal-report-total'),
          reportFigure('ui.meta.billable', 'billable', report.total.billableMinutes, 'data-journal-report-billable'),
          reportFigure('ui.meta.nonBillable', 'non-billable', report.total.minutes - report.total.billableMinutes, 'data-journal-report-non-billable')
        ]),
        exportBtns
      ]));
      if (!report.total.count) return;
      report.deals.forEach(function (group) {
        var block = el('div', { className: 'journal-report-deal', 'data-journal-report-deal': group.deal }, [
          el('div', { className: 'journal-report-deal-head' }, [
            el('div', { className: 'journal-entry-title', textContent: group.deal }),
            el('div', { className: 'journal-minutes', 'data-journal-report-deal-total': String(group.minutes), textContent: formatDuration(group.minutes, tr) })
          ]),
          el('div', { className: 'journal-meta', textContent: tr('ui.report.dealTotal', {
            deal: group.deal,
            total: formatDuration(group.minutes, tr),
            billable: formatDuration(group.billableMinutes, tr)
          }, group.deal + ': ' + formatDuration(group.minutes, tr) + ', billable ' + formatDuration(group.billableMinutes, tr)) })
        ]);
        group.days.forEach(function (day) {
          day.entries.forEach(function (entry) {
            block.appendChild(el('div', { className: 'journal-report-row' }, [
              el('div', { className: 'journal-date', textContent: entry.date }),
              el('div', { className: 'journal-report-title', textContent: entry.title }),
              el('div', { className: 'journal-minutes', textContent: formatDuration(entry.minutes, tr) })
            ]));
          });
        });
        reportEl.appendChild(block);
      });
    }

    function renderList() {
      listEl.innerHTML = '';
      var shown = visibleEntries();
      if (!shown.length) {
        listEl.appendChild(el('div', {
          className: 'journal-empty',
          textContent: entries.length
            ? tr('ui.noMatches', null, 'No entries match these filters.')
            : tr('ui.empty', null, 'No worklog entries yet.')
        }));
        return;
      }
      shown.forEach(function (entry) {
        listEl.appendChild(el('div', {
          className: 'journal-row',
          'data-journal-entry': entry.entryId
        }, [
          el('div', { className: 'journal-date', textContent: entry.date }),
          el('div', { className: 'journal-main' }, [
            el('div', { className: 'journal-entry-title', textContent: entry.title }),
            entry.summary ? el('div', { className: 'journal-summary', textContent: entry.summary }) : null,
            el('div', { className: 'journal-meta', textContent: entryMeta(entry) })
          ]),
          el('div', { className: 'journal-minutes', textContent: tr('ui.minutesValue', { minutes: entry.minutes }, entry.minutes + ' min') }),
          el('div', { className: 'journal-row-actions' }, [
            el('button', { className: 'journal-icon-btn', type: 'button', title: tr('ui.edit', null, 'Edit'), 'aria-label': tr('ui.edit', null, 'Edit'), 'data-journal-action': 'edit', innerHTML: iconSvg('edit'), onClick: function () { showEntryModal(entry); } }),
            el('button', { className: 'journal-icon-btn danger', type: 'button', title: tr('ui.delete', null, 'Delete'), 'aria-label': tr('ui.delete', null, 'Delete'), 'data-journal-action': 'delete', innerHTML: iconSvg('trash'), onClick: function () { deleteEntry(entry); } })
          ])
        ]));
      });
    }

    function render() {
      var shownCount = visibleEntries().length;
      countEl.textContent = tr(
        shownCount === 1 ? 'ui.entryCount.one' : 'ui.entryCount.many',
        { count: shownCount },
        shownCount === 1 ? '{count} entry' : '{count} entries'
      );
      buildFilters();
      statusEl.textContent = statusText;
      statusEl.className = 'journal-status' + (statusClass ? ' ' + statusClass : '');
      addBtn.disabled = false;
      reportLabelEl.textContent = mode === 'report'
        ? tr('ui.report.close', null, 'Entries')
        : tr('ui.report.open', null, 'Report');
      if (mode === 'report') {
        listEl.setAttribute('hidden', 'hidden');
        reportEl.removeAttribute('hidden');
        proposalsEl.setAttribute('hidden', 'hidden');
        renderReport();
        return;
      }
      reportEl.setAttribute('hidden', 'hidden');
      listEl.removeAttribute('hidden');
      renderProposals();
      renderList();
    }

    render();
    // The Deals have to be known before the journal can be read: in the global
    // Journal they are the list of places to read it from.
    loadWorkspaceOptions().then(loadStored).then(function () {
      render();
      // A proposal handed over from another tool opens straight away; asking
      // every provider for its own list must not delay that.
      var candidate = candidateFromRequest(props && props.toolRequest, scope.workspaceRoot);
      var completedTodo = completedTodoFromRequest(props && props.toolRequest, scope.workspaceRoot);
      if (candidate) showEntryModal(null, candidate);
      else if (completedTodo) showEntryModal(null, null, completedTodo);
      return loadProposals();
    }).then(render);
    if (api && api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
      api.i18n.onDidChangeLocale(function () {
        titleEl.textContent = scope.mode === 'global' ? tr('ui.title', null, 'Journal') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Journal · ' + scope.label);
        addBtn.innerHTML = iconSvg('add') + '<span>' + tr('ui.add', null, 'Add') + '</span>';
        render();
      });
    }
  };

  JournalView.unmount = function (containerEl) {
    if (containerEl) containerEl.innerHTML = '';
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: {
      JournalView: JournalView
    }
  });
})();
