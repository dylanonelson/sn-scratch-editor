type ExtensionPermission = {
  name: string;
}

interface Item {
  content: {
    preview_plain: string;
    preview_html: string;
    title: string;
    text: string;
  },
  uuid: string,
}

interface ContextItem extends Item {}

interface PresaveCallback {
  (): void;
}

interface SaveCompleteCallback {
  (): void;
}

declare module 'sn-components-api' {
  class ComponentManager {
    constructor(permissions: ExtensionPermission[], onReady?: () => void);
    streamContextItem(callback: (item: ContextItem) => void): void;
    saveItemWithPresave(item: Item, presave?: PresaveCallback, callback?: SaveCompleteCallback): void;
  }

  export = ComponentManager;

  interface Test {
    a: boolean;
  }
}
