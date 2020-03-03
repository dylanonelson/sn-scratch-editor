type ExtensionPermission = {
    name: string;
};

declare module 'sn-components-api' {
    class ComponentManager {
        constructor(permissions: ExtensionPermission[], onReady?: () => void);
    }

    export = ComponentManager;
}