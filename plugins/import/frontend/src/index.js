import './style.css';
import ImportSettings from './ImportSettings.svelte';

function mount(container, props, api) {
  container.__verstakImportInstance?.$destroy?.();
  const instance = new ImportSettings({ target: container, props: { ...props, api } });
  container.__verstakImportInstance = instance;
  return instance;
}

function unmount(container) {
  container.__verstakImportInstance?.$destroy?.();
  delete container.__verstakImportInstance;
}

window.VerstakPluginRegister('verstak.import', {
  components: {
    ImportSettings: { mount, unmount },
  },
});
