import { Plugin, Transaction } from 'prosemirror-state';
import { isListBlock } from './schemaHelpers';

export const findAndJoinLists = (state): Transaction => {
  const { tr } = state;

  const positions = [];
  for (let p = 0, i = 1; i < tr.doc.childCount; i += 1) {
    const node = tr.doc.child(i);
    const prevNode = tr.doc.child(i - 1);
    p = p + prevNode.nodeSize;
    if (
      isListBlock(node) &&
      isListBlock(prevNode) &&
      node.type === prevNode.type
    ) {
      positions.push(p);
    }
  }

  for (const p of positions) {
    tr.join(tr.mapping.map(p));
  }

  return tr.docChanged ? tr : null;
};

export class JoinListsPlugin extends Plugin {
  constructor() {
    super({
      appendTransaction(transactions, _oldState, newState) {
        for (let i = 0; i < transactions.length; i += 1) {
          const tr = transactions[i];
          if (tr.docChanged) {
            return findAndJoinLists(newState);
          }
        }
        return null;
      },
    });
  }
}
