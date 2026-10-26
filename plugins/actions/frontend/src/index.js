(function () {
  'use strict';
  var ID = 'verstak.actions';
  var KEY = 'actions';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var changes = new Set();
  var mounts = new WeakMap();
  var writes = Promise.resolve();

  function t(api, key, params) { return api.i18n.t('ui.' + key, params); }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'className') node.className = attrs[key];
      else if (key === 'textContent') node.textContent = attrs[key];
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }
  function load(api) { return api.settings.read(KEY).then(function (value) { return Array.isArray(value) ? value.filter(function(record){return record && typeof record === 'object' && typeof record.id === 'string';}) : []; }); }
  function visible(records) {
    return records.filter(function (r) { return r && !r.deleted && typeof r.id === 'string'; }).sort(function (a, b) { return (Number(a.rank) || 0) - (Number(b.rank) || 0) || a.id.localeCompare(b.id); });
  }
  function validate(record) {
    if (!record || typeof record.title !== 'string' || !record.title.trim() || record.title.length > 120) throw new Error('invalid_action');
    if (['application', 'script', 'url'].indexOf(record.type) === -1 || typeof record.target !== 'string' || !record.target.trim()) throw new Error('invalid_action');
    if (record.workspaceId !== '' && !UUID.test(record.workspaceId)) throw new Error('invalid_scope');
    if (!Array.isArray(record.args) || record.args.length > 256 || record.args.some(function (a) { return typeof a !== 'string' || a.indexOf('\0') !== -1; })) throw new Error('invalid_arguments');
    if (record.type === 'script' && (!record.interpreter || !(/^(\/|[a-z]:[\\/])/i.test(record.target)))) throw new Error('invalid_script');
    if (record.type === 'url') { var u = new URL(record.target); if (['http:', 'https:'].indexOf(u.protocol) === -1 || u.username || u.password) throw new Error('invalid_url'); }
    if (record.mode !== 'wait' && record.mode !== 'detached') throw new Error('invalid_action');
    if (typeof record.icon !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(record.icon)) throw new Error('invalid_action');
    return record;
  }
  // Only group words and unescape quotes. No shell expansion or evaluation.
  // Backslashes in paths stay literal unless directly before a double quote.
  function parseArguments(text) {
    var args = [], word = '', quote = '', started = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '\\' && quote !== "'") {
        var end = i;
        while (text[end] === '\\') end++;
        var count = end - i;
        if (text[end] === '"') {
          word += '\\'.repeat(Math.floor(count / 2)); started = true;
          if (count % 2) word += '"';
          else quote = quote === '"' ? '' : '"';
          i = end; continue;
        }
        word += text.slice(i, end); started = true; i = end - 1; continue;
      }
      if ((ch === '"' || ch === "'") && (!quote || quote === ch)) {
        quote = quote ? '' : ch; started = true;
      } else if (/\s/.test(ch) && !quote) {
        if (started) args.push(word);
        word = ''; started = false;
      } else { word += ch; started = true; }
    }
    if (quote) throw new Error('invalid_arguments');
    if (started) args.push(word);
    return args;
  }
  function formatArguments(args) {
    return args.map(function (arg) {
      if (arg && !/[\s"']/.test(arg)) return arg;
      return '"' + arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1') + '"';
    }).join(' ');
  }
  function enqueue(fn) { var result = writes.then(fn); writes = result.catch(function () {}); return result; }
  function notify() { changes.forEach(function (refresh) { refresh(); }); }
  function upsert(api, records, record) {
    if (!records.some(function (r) { return r.id === record.id; }) && records.length >= 10000) throw new Error('action_limit');
    if (!api.settings.upsertRecord) throw new Error('host_upgrade_required');
    return api.settings.upsertRecord(KEY, 'id', record, 10000);
  }
  function save(api, args) {
    return enqueue(function () { return load(api).then(function (records) {
      var before = records.find(function (r) { return r.id === args.id; });
      var record = validate({
        id: args.id || window.crypto.randomUUID(), title: args.title, description: String(args.description || '').slice(0, 2000), icon: args.icon || 'external-link',
        type: args.type, target: args.target, interpreter: String(args.interpreter || ''), args: args.args || [], cwd: String(args.cwd || ''), mode: args.mode || 'wait',
        workspaceId: args.workspaceId || '', rank: before ? before.rank : visible(records).reduce(function (max, r) { return Math.max(max, Number(r.rank) || 0); }, 0) + 1024,
        updatedAt: new Date().toISOString()
      });
      if (args.id && (!before || before.deleted)) throw new Error('action_not_found');
      return upsert(api, records, record).then(function () { notify(); return record; });
    }); });
  }
  function remove(api, id) {
    return enqueue(function () { return load(api).then(function (records) {
      if (!records.some(function (r) { return r.id === id && !r.deleted; })) throw new Error('action_not_found');
      // A tombstone keeps a concurrent/offline definition from reappearing.
      return upsert(api, records, { id: id, deleted: true, updatedAt: new Date().toISOString() }).then(notify);
    }); });
  }
  function reorder(api, id, otherID) {
    return enqueue(function () { return load(api).then(function (records) {
      var a = records.find(function (r) { return r.id === id; });
      var b = records.find(function (r) { return r.id === otherID; });
      if (!a || !b || a.deleted || b.deleted || a.workspaceId !== b.workspaceId) throw new Error('action_not_found');
      // Sync may bring two independently created records with the same rank.
      // Reindex this scope so those records can still be reordered by the user.
      var ordered = visible(records).filter(function(record){return record.workspaceId === a.workspaceId;});
      var from = ordered.findIndex(function(record){return record.id === id;});
      var to = ordered.findIndex(function(record){return record.id === otherID;});
      ordered.splice(from, 1); ordered.splice(to, 0, a);
      var pending = Promise.resolve();
      ordered.forEach(function(record,index){
        var rank = (index + 1) * 1024;
        if (record.rank !== rank) pending = pending.then(function(){return upsert(api, records, Object.assign({},record,{rank:rank}));});
      });
      return pending.then(notify);
    }); });
  }
  function request(record) {
    validate(record);
    if (record.type === 'url') return { kind: 'url', url: record.target };
    return { kind: 'process', executable: record.type === 'script' ? record.interpreter : record.target, args: record.type === 'script' ? [record.target].concat(record.args) : record.args.slice(), cwd: record.cwd, mode: record.mode };
  }

  var CSS = `
.actions-view{height:100%;min-height:0;overflow:auto;box-sizing:border-box;padding:1rem;container-type:inline-size;color:var(--vt-color-text-primary);display:flex;flex-direction:column;gap:1rem}
.actions-toolbar,.actions-controls{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.actions-toolbar h2{font-size:1.1rem;margin:0;flex:1}
.actions-hint{font-size:.85rem;line-height:1.5;color:var(--vt-color-text-muted);margin:0}
.actions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:.5rem}
.actions-card{position:relative;min-width:0;border:1px solid var(--vt-color-border);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface);overflow:hidden}
.actions-view .actions-launch{display:flex;align-items:center;gap:.6rem;text-align:left;width:100%;height:80px;padding:1.5rem .75rem .6rem;border:0;border-radius:inherit;background:transparent;color:inherit;cursor:pointer;font:inherit}
.actions-launch span{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.actions-launch svg{flex-shrink:0}
.actions-launch:hover{background:var(--vt-color-surface-hover)}
.actions-card-controls{position:absolute;top:3px;right:3px;display:flex;gap:2px;opacity:0;pointer-events:none;background:var(--vt-color-surface);border-radius:var(--vt-radius-sm,4px)}
.actions-card:hover .actions-card-controls,.actions-card:focus-within .actions-card-controls{opacity:1;pointer-events:auto}
.actions-view .actions-card-controls button{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;min-width:24px;min-height:24px;padding:3px;border:0;border-radius:var(--vt-radius-sm,4px);background:transparent;color:var(--vt-color-text-secondary);cursor:pointer}
.actions-view .actions-card-controls button:hover{background:var(--vt-color-surface-hover);color:var(--vt-color-text-primary)}
.actions-view button:focus-visible{outline:2px solid var(--vt-color-accent);outline-offset:-2px}
@media(hover:none){.actions-card-controls{opacity:1;pointer-events:auto}}
.actions-status{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85rem;line-height:1.5}.actions-status.error{color:var(--vt-color-danger-foreground)}
.actions-form{display:grid;gap:.8rem;width:100%;max-width:44rem;box-sizing:border-box}
.actions-field[hidden]{display:none}.actions-field{display:grid;gap:.3rem;min-width:0;font-size:.85rem}
.actions-input,.actions-form .vt-select{width:100%;box-sizing:border-box;min-height:2.3rem;padding:.5rem .6rem;border:1px solid var(--vt-color-border);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface);color:var(--vt-color-text-primary);font:inherit}
.actions-form textarea{resize:vertical;min-height:4.5rem}
.actions-icon-picker{justify-self:start;display:inline-flex;align-items:center;gap:.5rem}
.actions-output{max-height:20rem;overflow:auto;border:1px solid var(--vt-color-border);border-radius:var(--vt-radius-sm,4px);padding:.75rem;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.82rem;margin:0}
.actions-section-title{font-size:.95rem;margin:0 0 .6rem}.actions-view button:disabled{opacity:.55;cursor:default}
.actions-confirm{border-top:1px solid var(--vt-color-border);padding:.75rem}
`;


  function ActionsView() {}
  ActionsView.mount = function (container, props, api) {
    props = props || {};
    var workspaceId = props.workspaceId || (props.workspaceNode && (props.workspaceNode.workspaceId || props.workspaceNode.id)) || '';
    if (workspaceId && !UUID.test(workspaceId)) throw new Error('invalid_scope');
    var disposed = false, records = [], editing = null, deleting = '', busy = '', operationID = '', outcome = null, status = '', failed = false, focusAfterRender = '';
    var root = el('div', {className:'actions-view', 'data-actions-view':''});
    var style = el('style', {textContent: CSS});
    container.appendChild(style); container.appendChild(root);
    function button(label, action, attrs) { return el('button', Object.assign({type:'button',className:'vt-button ghost',textContent:t(api, label), 'data-action':action}, attrs || {})); }
    function iconButton(action, icon, id) {
      var control = button(action, action, {'data-action-id':id,title:t(api,action),'aria-label':t(api,action),textContent:''});
      if (api.ui.createIcon) control.appendChild(api.ui.createIcon(icon,16));
      return control;
    }
    function fail(error) {
      var message = String(error && error.message || '');
      var codes = ['program_not_found', 'directory_not_found', 'approval_required', 'invalid_arguments', 'invalid_script', 'invalid_url', 'invalid_action', 'invalid_scope', 'start_failed', 'action_not_found', 'action_limit', 'host_upgrade_required', 'invalid_directory', 'absolute_executable_required', 'invalid_limits', 'invalid_request', 'open_failed', 'process_control_unavailable', 'too_many_processes', 'approval_store_unavailable', 'approval_store_invalid', 'review_failed', 'review_expired'];
      var code = codes.find(function (value) { return message.indexOf(value) !== -1; });
      status = t(api, code || 'operation_failed'); failed = true; render();
    }
    function field(form, name, tag, value, options) {
      var input = el(tag || 'input', {className:tag === 'select' ? 'vt-select' : 'actions-input', 'data-action-field':name, id:'actions-' + name});
      (options || []).forEach(function (item) { input.appendChild(el('option', {value:item[0],textContent:item[1]})); });
      input.value = value == null ? '' : value;
      input.addEventListener('input', function () {
        if (name === 'args') editing._argsText = input.value;
        else editing[name === 'scope' ? 'workspaceId' : name] = input.value;
      });
      form.appendChild(el('label', {className:'actions-field', for:'actions-' + name}, [el('span',{textContent:t(api, name)}), input]));
      return input;
    }
    function editor() {
      var form = el('form', {className:'actions-form','data-action-form':''});
      var title = field(form, 'title', 'input', editing.title); title.required = true; title.maxLength = 120;
      var description = field(form, 'description', 'textarea', editing.description);
      var iconValue = editing.icon || 'external-link';
      var icon = button('icon', 'pick-icon', {className:'vt-button secondary actions-icon-picker','data-action-field':'icon','aria-label':t(api,'icon')});
      function drawIcon() {
        icon.textContent = '';
        if (api.ui.createIcon) icon.appendChild(api.ui.createIcon(iconValue));
        icon.appendChild(el('span',{textContent:iconValue}));
      }
      drawIcon(); form.appendChild(el('div',{className:'actions-field'},[el('span',{textContent:t(api,'icon')}),icon]));
      icon.addEventListener('click', function () {
        if (!api.ui.pickIcon) { fail(new Error('host_upgrade_required')); return; }
        icon.disabled = true;
        api.ui.pickIcon(iconValue).then(function (value) {
          if (!disposed && value !== null) { iconValue = value; editing.icon = value; drawIcon(); }
        }).catch(fail).finally(function () { icon.disabled = false; if (!disposed && icon.isConnected) icon.focus(); });
      });
      var type = field(form, 'type', 'select', editing.type || 'application', ['application','script','url'].map(function (v) { return [v,t(api,v)]; }));
      var target = field(form, 'target', 'input', editing.target); target.required = true; target.autocomplete = 'off';
      var interpreter = field(form, 'interpreter', 'input', editing.interpreter);
      var args = field(form, 'args', 'input', editing._argsText == null ? formatArguments(editing.args || []) : editing._argsText);
      args.autocomplete = 'off'; args.spellcheck = false; args.placeholder = t(api,'argsPlaceholder');
      var argsHint = el('p',{className:'actions-hint',textContent:t(api,'argsHint')}); form.appendChild(argsHint);
      var cwd = field(form, 'cwd', 'input', editing.cwd);
      var mode = field(form, 'mode', 'select', editing.mode || 'wait', ['wait','detached'].map(function(v){return [v,t(api,v)];}));
      var scopes = [['',t(api,'global')]];
      if (workspaceId) scopes.push([workspaceId,t(api,'thisDeal')]);
      var scope = field(form, 'scope', 'select', editing.workspaceId || '', scopes);
      function typeFields() {
        var isURL = type.value === 'url'; argsHint.hidden = isURL;
        interpreter.parentNode.hidden = type.value !== 'script';
        [args,cwd,mode].forEach(function (input) { input.parentNode.hidden = isURL; });
      }
      type.addEventListener('change', typeFields); typeFields();
      var submit = button('save', 'save', {type:'submit',className:'vt-button primary'});
      if (busy) submit.disabled = true;
      var cancel = button('cancel', 'cancel'); cancel.addEventListener('click',function () {editing=null;status='';render();});
      form.appendChild(el('div',{className:'actions-controls'},[submit,cancel]));
      form.addEventListener('submit',function(event){
        event.preventDefault(); if (busy) return;
        var argv; try { argv = type.value === 'url' ? [] : editing._argsText == null ? (editing.args || []).slice() : parseArguments(args.value); } catch (_) { fail(new Error('invalid_arguments')); return; }
        var values = {id:editing.id,title:title.value.trim(),description:description.value,icon:iconValue,type:type.value,target:target.value.trim(),interpreter:interpreter.value.trim(),args:argv,cwd:cwd.value.trim(),mode:mode.value,workspaceId:scope.value};
        editing = values; busy='save'; status=''; render();
        save(api,values).then(function(){editing=null;status=t(api,'saved');failed=false;}).catch(fail).finally(function(){busy='';render();});
      });
      root.appendChild(form);
    }
    function run(record) {
      if (busy) return;
      var r;
      try { r=request(record); } catch(error) {fail(error);return;}
      if (!api.processes) {fail(new Error('host_upgrade_required'));return;}
      busy=record.id;outcome=null;failed=false;status=t(api,'reviewing');render();
      api.processes.approved(r).then(function(approved){ return approved || api.processes.review(r); }).then(function(approved){
        if (!approved || disposed) {status=t(api,'notRun');return null;}
        // A synced edit while the native review was open must not launch an old definition.
        return load(api).then(function(current){
          var latest=current.find(function(value){return value.id===record.id && !value.deleted;});
          if (!latest || JSON.stringify(request(latest))!==JSON.stringify(r)) throw new Error('approval_required');
          operationID=window.crypto.randomUUID();status=t(api,'running');render();
          return api.processes.run(operationID,r);
        });
      }).then(function(result){
        if (!result) return;
        outcome=result;
        status=t(api,result.timedOut?'timedOut':result.outputLimited?'outputLimited':result.cancelled?'cancelled':r.kind==='url'||r.mode==='detached'?'started':'exited',{code:result.exitCode});
        failed=result.timedOut||result.outputLimited||result.cancelled||(r.mode==='wait'&&result.exitCode!==0);
      }).catch(fail).finally(function(){busy='';operationID='';render();});
    }
    function cards(list, label) {
      var section=el('section',{},[el('h3',{className:'actions-section-title',textContent:label})]);
      var grid=el('div',{className:'actions-grid'});
      if (!list.length) grid.appendChild(el('p',{className:'actions-hint',textContent:t(api,'empty')}));
      list.forEach(function(record,index){
        var launch=button('run','run',{'data-action-id':record.id,className:'actions-launch',textContent:'',title:record.description || record.title,'aria-label':record.title});
        if(api.ui.createIcon)launch.appendChild(api.ui.createIcon(record.icon,22));
        launch.appendChild(el('span',{textContent:record.title}));
        launch.disabled=!!busy;launch.addEventListener('click',function(){run(record);});
        var edit=iconButton('edit','pencil',record.id);edit.addEventListener('click',function(){editing=Object.assign({},record);status='';focusAfterRender='title';render();});
        var del=iconButton('delete','trash-2',record.id);del.addEventListener('click',function(){deleting=record.id;render();});
        var up=iconButton('up','arrow-up',record.id);up.disabled=index===0||!!busy;up.addEventListener('click',function(){reorder(api,record.id,list[index-1].id).catch(fail);});
        var forget=iconButton('forget','shield',record.id);forget.disabled=!!busy;
        forget.addEventListener('click',function(){try{api.processes.revoke(request(record)).then(function(){status=t(api,'forgotten');failed=false;render();}).catch(fail);}catch(error){fail(error);}});
        var down=iconButton('down','arrow-down',record.id);down.disabled=index===list.length-1||!!busy;down.addEventListener('click',function(){reorder(api,record.id,list[index+1].id).catch(fail);});
        edit.disabled=!!busy;del.disabled=!!busy;
        var card=el('article',{className:'actions-card'},[launch,el('div',{className:'actions-card-controls'},[edit,del,up,down,forget])]);
        if(deleting===record.id){
          var yes=button('confirmDelete','confirm-delete');yes.disabled=!!busy;yes.addEventListener('click',function(){remove(api,record.id).then(function(){deleting='';status=t(api,'deleted');render();}).catch(fail);});
          var no=button('cancel','cancel-delete');no.addEventListener('click',function(){deleting='';render();});
          card.appendChild(el('div',{className:'actions-confirm'},[el('p',{textContent:t(api,'deleteConfirm')}),yes,no]));
        }
        grid.appendChild(card);
      });
      section.appendChild(grid);root.appendChild(section);
    }
    function render() {
      if(disposed)return;
      root.textContent='';
      var add=button('add','add',{className:'vt-button primary'});add.disabled=!!busy;add.addEventListener('click',function(){editing={workspaceId:workspaceId};status='';focusAfterRender='title';render();});
      root.appendChild(el('div',{className:'actions-toolbar'},[el('h2',{textContent:t(api,'heading')}),add]));
      if(status)root.appendChild(el('div',{className:'actions-status'+(failed?' error':''),role:failed?'alert':'status','data-action-status':'',textContent:status}));
      if(operationID){var cancel=button('stop','stop');cancel.addEventListener('click',function(){api.processes.cancel(operationID).catch(fail);});root.appendChild(cancel);}
      if(outcome&&(outcome.stdout||outcome.stderr))root.appendChild(el('pre',{className:'actions-output','data-action-output':'',textContent:(outcome.stdout?t(api,'stdout')+'\n'+outcome.stdout:'')+(outcome.stderr?'\n'+t(api,'stderr')+'\n'+outcome.stderr:'')}));
      if(editing)editor();
      else {
        var all=visible(records);
        if(workspaceId)cards(all.filter(function(r){return r.workspaceId===workspaceId;}),t(api,'thisDeal'));
        cards(all.filter(function(r){return r.workspaceId==='';}),t(api,'global'));
      }
      if(focusAfterRender){var focus=root.querySelector('[data-action-field="'+focusAfterRender+'"]');focusAfterRender='';if(focus)focus.focus();}
    }
    function refresh(){return load(api).then(function(next){records=next;render();}).catch(fail);}
    changes.add(refresh);
    var offLocale=api.i18n.onDidChangeLocale(render);
    var offEvents=null;
    api.events.subscribe('plugin.records.changed',function(event){if(event.payload&&event.payload.pluginId===ID)refresh();}).then(function(off){if(disposed)off();else offEvents=off;});
    render();refresh();
    mounts.set(container, function(){
      disposed=true;changes.delete(refresh);offLocale();if(offEvents)offEvents();container.textContent='';
      if(operationID&&api.processes)return api.processes.cancel(operationID).catch(function(){});
    });
  };
  ActionsView.unmount = function(container){var cleanup=mounts.get(container);mounts.delete(container);if(cleanup)return cleanup();};
  window.VerstakPluginRegister(ID, {components:{ActionsView:ActionsView},activate:function(api){
    return Promise.all([
      api.commands.register('verstak.actions.open',function(){return api.ui.openView('verstak.actions.view');}),
      api.commands.register('verstak.actions.list',function(){return load(api).then(visible);}),
      api.commands.register('verstak.actions.save',function(args){return save(api,args);}),
      api.commands.register('verstak.actions.delete',function(args){return remove(api,args.id);})
    ]);
  }});
})();
