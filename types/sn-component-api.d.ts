type ExtensionPermission = {
  name: string;
};

interface Item {
  content: {
    preview_plain: string;
    preview_html: string;
    title: string;
    text: string;
  };
  uuid: string;
}

interface ContextItem extends Item {}

interface PresaveCallback {
  (): void;
}

interface SaveCompleteCallback {
  (): void;
}
