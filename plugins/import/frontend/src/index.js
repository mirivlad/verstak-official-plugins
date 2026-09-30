import './style.css';
import { mount as mountComponent, unmount as unmountComponent } from 'svelte';
import ImportSettings from './ImportSettings.svelte';

function mount(container, props, api) {
  unmount(container);
  const instance = mountComponent(ImportSettings, { target: container, props: { ...props, api } });
  container.__verstakImportInstance = instance;
  return instance;
}

function unmount(container) {
  if (container.__verstakImportInstance) unmountComponent(container.__verstakImportInstance);
  delete container.__verstakImportInstance;
}

window.VerstakPluginRegister('verstak.import', {
  components: {
    ImportSettings: { mount, unmount },
  },
});
