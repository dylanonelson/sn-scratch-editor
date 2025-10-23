import { EditorState, Plugin, PluginKey } from 'prosemirror-state';

type PositionMapperPluginState = {
  positions: Record<string, number>;
};

export const positionMapperPluginKey = new PluginKey<PositionMapperPluginState>(
  'position-mapper-plugin-key',
);

export const positionMapperTransactionMetaKey = new PluginKey<{
  // Positions to be mapped through subsequent transactions. Should be positions
  // that are valid AFTER the current transaction is applied.
  addPositions?: Record<string, number | number[]>;
  removePositions?: string[];
}>('position-mapper-transaction-meta-key');

export const getPositionMapperPluginPositions = (state: EditorState) => {
  return positionMapperPluginKey.getState(state)?.positions ?? {};
};

export const getPositionMapperTransactionPositionsByKey = (
  state: EditorState,
  key: string,
): number | number[] | null => {
  const pluginState = positionMapperPluginKey.getState(state);
  if (!pluginState) return null;
  return pluginState.positions[key] ?? null;
};

export const positionMapperPlugin = new Plugin<PositionMapperPluginState>({
  state: {
    init() {
      return {
        positions: {},
      };
    },
    apply(tr, previous) {
      const next = { ...previous };
      if (tr.docChanged) {
        next.positions = Object.entries(previous.positions).reduce(
          (acc, [key, value]) => {
            acc[key] = Array.isArray(value)
              ? value.map((v) => tr.mapping.map(v))
              : tr.mapping.map(value);
            return acc;
          },
          {},
        );
      }
      const transactionMeta = tr.getMeta(positionMapperTransactionMetaKey);
      if (transactionMeta && transactionMeta.addPositions) {
        next.positions = {
          ...next.positions,
          ...transactionMeta.addPositions,
        };
      }
      if (transactionMeta && transactionMeta.removePositions) {
        next.positions = Object.entries(previous.positions).reduce(
          (acc: Record<string, number>, [key, value]) => {
            if (!transactionMeta.removePositions.includes(key)) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );
      }
      return next;
    },
  },
  key: positionMapperPluginKey,
});
