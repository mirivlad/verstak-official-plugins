import './style.css';

function mount(container, _props, api) {
  const root = document.createElement('section');
  root.className = 'verstak-import-placeholder';
  const title = document.createElement('h2');
  title.textContent = api.i18n.t('ui.title', undefined, 'Import');
  const description = document.createElement('p');
  description.textContent = api.i18n.t('ui.comingSoon', undefined, 'Choose a source to begin.');
  root.append(title, description);
  container.replaceChildren(root);
}

function unmount(container) {
  container.replaceChildren();
}

window.VerstakPluginRegister('verstak.import', {
  components: {
    ImportSettings: { mount, unmount },
  },
});
