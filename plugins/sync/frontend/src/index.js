import SyncSettings from './SyncSettings.svelte';
import SyncStatusBar from './SyncStatusBar.svelte';

window.VerstakPluginRegister('verstak.sync', {
  components: {
    SyncSettings: {
      mount(container, props, api) {
        return new SyncSettings({
          target: container,
          props: { ...props, api }
        });
      },
      unmount(container) {}
    },
    SyncStatusBar: {
      mount(container, props, api) {
        return new SyncStatusBar({
          target: container,
          props: { ...props, api }
        });
      },
      unmount(container) {}
    }
  }
});
