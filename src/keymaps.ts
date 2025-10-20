import {
  baseKeymap,
  chainCommands,
  deleteSelection,
  joinTextblockBackward,
  joinTextblockForward,
  selectNodeBackward,
  selectNodeForward,
  setBlockType,
  splitBlock,
} from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { ResolvedPos } from 'prosemirror-model';
import { splitListItem } from 'prosemirror-schema-list';
import {
  EditorState,
  Plugin,
  Selection,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import { schema } from './schema';
import { isListItemBlock, isParagraphBlock } from './schemaHelpers';

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

function ensureTextSelectionInEmptyNode(state: EditorState): boolean {
  const { $cursor } = state.selection as TextSelection;
  return Boolean($cursor && $cursor.parent.nodeSize === 2);
}

function ensureChecklistItemTextSelection(state: EditorState) {
  const { $cursor } = state.selection as TextSelection;
  return Boolean(
    $cursor && $cursor.parent.type === schema.nodes.checklist_item,
  );
}

function ensureListItemTextSelection(state: EditorState) {
  if (!(state.selection instanceof TextSelection)) {
    return false;
  }
  const { $cursor } = state.selection;
  const { depth } = $cursor;
  if (depth === 0) {
    return false;
  }
  const grandparentNode = $cursor.node(depth - 1);
  return isParagraphBlock($cursor.parent) && isListItemBlock(grandparentNode);
}

export const keymapPlugins: Plugin[] = [
  // checklist item handlers
  keymap({
    Backspace(state, dispatch, view) {
      if (ensureChecklistItemTextSelection(state) === false) {
        return false;
      }
      if (view.endOfTextblock('left') === false) {
        return false;
      }

      if ((state.selection as TextSelection).$cursor.index(0) === 0) {
        setBlockType(schema.nodes.paragraph)(state, dispatch);
      }
    },
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
  }),
  // list item handlers
  keymap({
    Backspace: chainCommands(
      deleteSelection,
      joinTextblockBackward,
      selectNodeBackward,
    ),
    Delete: chainCommands(
      deleteSelection,
      joinTextblockForward,
      selectNodeForward,
    ),
    Enter: splitListItem(schema.nodes.list_item),
    'Shift-Enter': function (state, dispatch) {
      if (ensureListItemTextSelection(state) === false) {
        return false;
      }
      return splitBlock(state, dispatch);
    },
  }),
  keymap(baseKeymap),
];
