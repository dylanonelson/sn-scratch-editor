import {
  EditorState,
  Plugin,
  Selection,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import { ResolvedPos } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { baseKeymap, joinBackward } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import {
  liftListItem,
  sinkListItem,
  splitListItem,
} from 'prosemirror-schema-list';
import { schema } from './schema';

function recursiveDeleteEmpty(tr: Transaction, $pos: ResolvedPos): Transaction {
  const parentNode = $pos.parent;
  if (parentNode.nodeSize === 2) {
    const { pos } = $pos;
    return recursiveDeleteEmpty(
      tr.deleteRange(pos - 1, pos + 1),
      tr.doc.resolve(tr.mapping.map(pos)),
    );
  }
  return tr;
}

export const keymapPlugins: Plugin[] = [
  keymap({
    Enter: splitListItem(schema.nodes.list_item),
  }),
  keymap({
    Enter(state, dispatch) {
      const { selection, tr } = state;
      const { $from, from } = selection;
      if ($from.parent.type !== schema.nodes.checklist_item) {
        return false;
      }
      tr.deleteSelection();
      const next$From = tr.doc.resolve(from);
      if (next$From.parent.nodeSize === 2) {
        const nextFrom = next$From.pos;
        // The node is empty
        tr.replaceWith(
          nextFrom - 1,
          nextFrom + 1,
          schema.nodes.paragraph.createAndFill(),
        );
        tr.setSelection(Selection.near(tr.doc.resolve(nextFrom - 1)));
        dispatch(tr);
        return true;
      }
      tr.split(from, undefined, [
        {
          type: schema.nodes.checklist_item,
        },
      ]);
      dispatch(tr);
      return true;
    },
    Backspace(state, dispatch) {
      const { $cursor } = state.selection;
      if (!$cursor) {
        return false;
      }
      if ($cursor.parent.nodeSize !== 2) {
        return false;
      }
      const possibleSelection: TextSelection = Selection.findFrom(
        state.doc.resolve($cursor.before()),
        -1,
        true,
      );
      if (!possibleSelection) {
        return false;
      }
      if (
        possibleSelection.$cursor.node(-1).type !==
        schema.nodes.list_item
      ) {
        return;
      }
      let tr = state.tr.setSelection(possibleSelection);
      tr = recursiveDeleteEmpty(tr, $cursor);
      dispatch(tr);
      return true;
    },
  }),
  keymap(baseKeymap),
];
