import SyncSettings from './SyncSettings.svelte';
import SyncStatusBar from './SyncStatusBar.svelte';

function mountSvelte(Component, container, props, api) {
  container.__verstakSyncInstance?.$destroy?.();
  const instance = new Component({
    target: container,
    props: { ...props, api }
  });
  container.__verstakSyncInstance = instance;
  return instance;
}

function unmountSvelte(container) {
  container.__verstakSyncInstance?.$destroy?.();
  delete container.__verstakSyncInstance;
}

window.VerstakPluginRegister('verstak.sync', {
  components: {
    SyncSettings: {
      mount(container, props, api) {
        return mountSvelte(SyncSettings, container, props, api);
      },
      unmount: unmountSvelte
    },
    SyncStatusBar: {
      mount(container, props, api) {
        return mountSvelte(SyncStatusBar, container, props, api);
      },
      unmount: unmountSvelte
    }
  }
});
