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
import { liftListItem, splitListItem } from 'prosemirror-schema-list';
import { Command, Plugin, Selection, TextSelection } from 'prosemirror-state';
import { schema } from './schema';
import { getListBlockRange } from './schemaHelpers';

function ensureTextSelectionInEmptyNode(command: Command): Command {
  return function (state, dispatch) {
    const { $cursor } = state.selection as TextSelection;
    if (Boolean($cursor && $cursor.parent.nodeSize === 2)) {
      return command(state, dispatch);
    }
    return false;
  };
}

function ensureEmptyChecklistItemTextSelection(command: Command): Command {
  return function (state, dispatch) {
    const { $cursor } = state.selection as TextSelection;
    if (
      Boolean($cursor && $cursor.parent.type === schema.nodes.checklist_item)
    ) {
      return command(state, dispatch);
    }
    return false;
  };
}

function ensureListItemTextSelection(command: Command): Command {
  return function (state, dispatch) {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }
    const { $from, $to } = state.selection;
    const listBlockRange = getListBlockRange($from, $to);
    if (Boolean(listBlockRange)) {
      return command(state, dispatch);
    }
    return false;
  };
}

function ensureStartOfListItemTextSelection(command: Command): Command {
  return function (state, dispatch) {
    const { $from, $to } = state.selection;
    const listBlockRange = getListBlockRange($from, $to);
    console.log(
      'listBlockRange, $from.parentOffset',
      listBlockRange,
      $from.parentOffset,
    );
    if (
      state.selection instanceof TextSelection &&
      Boolean(listBlockRange) &&
      $from.parentOffset === 0
    ) {
      return command(state, dispatch);
    }
    return false;
  };
}

export const keymapPlugins: Plugin[] = [
  // checklist item handlers
  keymap({
    Backspace: ensureEmptyChecklistItemTextSelection(
      function (state, dispatch, view) {
        if (view.endOfTextblock('left') === false) {
          return false;
        }

        if ((state.selection as TextSelection).$cursor.index(0) === 0) {
          setBlockType(schema.nodes.paragraph)(state, dispatch);
        }
      },
    ),
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
    Enter: chainCommands(
      ensureStartOfListItemTextSelection(liftListItem(schema.nodes.list_item)),
      splitListItem(schema.nodes.list_item),
      ensureListItemTextSelection(function (state, dispatch) {
        const { tr } = state;
        tr.deleteSelection();
        // 2 = split the list item, not the paragraph. 1 is the default and
        // would split the paragraph.
        tr.split(tr.selection.from, 2);
        dispatch(tr);
        return true;
      }),
    ),
    'Shift-Enter': ensureListItemTextSelection(splitBlock),
  }),
  keymap(baseKeymap),
];
