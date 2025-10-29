import { NodeRange, NodeType, ResolvedPos } from 'prosemirror-model';
import {
  liftListItem,
  sinkListItem,
  wrapInList,
} from 'prosemirror-schema-list';
import { Command, EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  getPositionMapperTransactionPositionsByKey,
  positionMapperTransactionMetaKey,
} from './PositionMapperPlugin';
import { CheckboxStatus, schema } from './schema';
import { getListBlockRange, isListBlock } from './schemaHelpers';

/**
 * Swap text blocks to a given node type
 * This handles lifting list items if needed before converting
 */
export function swapTextBlock(view: EditorView, nodeType: NodeType): void {
  let { dispatch, state } = view;
  let { tr } = state;
  let {
    selection: { $from, $to },
  } = state;

  const listBlockRange = getListBlockRange($from, $to);
  if (containsNestedList($from, $to, listBlockRange)) {
    return;
  }
  if (isWithinNestedList($from, $to, listBlockRange)) {
    return;
  }
  if (
    nodeType !== schema.nodes.unordered_list &&
    nodeType !== schema.nodes.ordered_list
  ) {
    liftListItem(schema.nodes.list_item)(state, dispatch);
  }

  ({ dispatch, state } = view);
  ({ tr } = state);
  const {
    selection: { from, to },
  } = state;
  tr.setBlockType(from, to, nodeType);
  dispatch(tr);
}

export const toggleChecklistItemState: Command = function (
  state: EditorState,
  dispatch: EditorView['dispatch'] | undefined,
) {
  const { $from, $to } = state.selection;

  const blockRange = $from.blockRange($to);

  let hasChecked = false;
  for (
    let index = blockRange.startIndex, child = blockRange.parent.child(index);
    index < blockRange.endIndex;
    index += 1
  ) {
    if (child.type !== schema.nodes.checklist_item) {
      return false;
    }
    if (child.attrs.status === CheckboxStatus.DONE) {
      hasChecked = true;
      break;
    }
  }

  if (!dispatch) {
    return true;
  }

  const { tr } = state;
  for (
    let index = blockRange.startIndex,
      child = blockRange.parent.child(index),
      pos = blockRange.start;
    index < blockRange.endIndex;
    index += 1
  ) {
    tr.setNodeMarkup(pos, undefined, {
      status: hasChecked ? CheckboxStatus.EMPTY : CheckboxStatus.DONE,
    });
    pos += child.nodeSize;
  }

  dispatch(tr);
  return true;
};

function outdentListBlockAfterPos(
  view: EditorView,
  listBlockRange: NodeRange,
  pos: number,
) {
  const posArray = [];
  // Iterate over all the list items in the range
  view.state.doc.nodesBetween(
    listBlockRange.start,
    listBlockRange.end,
    (node, nodePos) => {
      if (nodePos < pos) {
        // We only care about stuff that falls after the selection
        return;
      }
      if (node.type !== schema.nodes.list_item) {
        // We only care about list items
        return;
      }
      // Store the first valid text position inside the list item > paragraph
      posArray.push(nodePos + 2);
      // We have to return false to keep from deindenting the sublists, which
      // will be handled when we deindent their parent
      return false;
    },
  );

  const LIST_ITEMS_TO_DEINDENT_KEY = 'listItemsToDeindent';
  view.dispatch(
    view.state.tr.setMeta(positionMapperTransactionMetaKey, {
      addPositions: {
        [LIST_ITEMS_TO_DEINDENT_KEY]: posArray,
      },
    }),
  );

  if (posArray.length === 0) {
    return false;
  }

  for (let i = 0; i < posArray.length; i++) {
    const mappedPosArray = getPositionMapperTransactionPositionsByKey(
      view.state,
      LIST_ITEMS_TO_DEINDENT_KEY,
    );
    const mappedPos = mappedPosArray[i];
    const deindentSelection = TextSelection.create(
      view.state.doc,
      mappedPos,
      mappedPos,
    );
    view.dispatch(view.state.tr.setSelection(deindentSelection));
    liftListItem(schema.nodes.list_item)(view.state, view.dispatch);
  }
  view.dispatch(
    view.state.tr.setMeta(positionMapperTransactionMetaKey, {
      removePositions: [LIST_ITEMS_TO_DEINDENT_KEY],
    }),
  );
  return true;
}

export function outdentListSelection(view: EditorView) {
  const listBlockRange = getListBlockRange(
    view.state.selection.$from,
    view.state.selection.$to,
  );
  if (!listBlockRange) {
    return false;
  }
  const { $from, $anchor, $head } = view.state.selection;
  const startOfListItem = $from.start($from.depth - 2);
  const LIST_ITEM_SELECTION_OUTDENT_ANCHOR_KEY =
    'listItemOutdentSelectionAnchor';
  const LIST_ITEM_SELECTION_OUTDENT_HEAD_KEY = 'listItemOutdentSelectionHead';

  view.dispatch(
    view.state.tr.setMeta(positionMapperTransactionMetaKey, {
      addPositions: {
        [LIST_ITEM_SELECTION_OUTDENT_ANCHOR_KEY]: $anchor.pos,
        [LIST_ITEM_SELECTION_OUTDENT_HEAD_KEY]: $head.pos,
      },
    }),
  );
  if (outdentListBlockAfterPos(view, listBlockRange, startOfListItem)) {
    const originalOutdentSelectionAnchor =
      getPositionMapperTransactionPositionsByKey(
        view.state,
        LIST_ITEM_SELECTION_OUTDENT_ANCHOR_KEY,
      );
    const originalOutdentSelectionHead =
      getPositionMapperTransactionPositionsByKey(
        view.state,
        LIST_ITEM_SELECTION_OUTDENT_HEAD_KEY,
      );
    view.dispatch(
      view.state.tr
        .setSelection(
          TextSelection.create(
            view.state.doc,
            originalOutdentSelectionAnchor as number,
            originalOutdentSelectionHead as number,
          ),
        )
        .setMeta(positionMapperTransactionMetaKey, {
          removePositions: [
            LIST_ITEM_SELECTION_OUTDENT_ANCHOR_KEY,
            LIST_ITEM_SELECTION_OUTDENT_HEAD_KEY,
          ],
        }),
    );
    return true;
  }
}

/**
 * Update the list type of the selection.
 * - If the selection overlaps with list nodes and non-list nodes, or if it
 *   includes any portion of a nested list, do nothing
 * - If the selection is not a list, change it into one
 * - If the selection is a list but not the desired list type, change it into
 *   the desired list type
 * - If the selection is the passed in list type, change it into a paragraph
 */
export const toggleList = function (
  view: EditorView,
  listType: NodeType,
  itemType: NodeType,
): void {
  const {
    state: {
      selection: { $from, $to },
    },
  } = view;

  const listBlockRange = getListBlockRange($from, $to, [listType]);
  if (containsNestedList($from, $to, listBlockRange)) {
    // If the selection overlaps with a nested list, do nothing.
    return;
  }
  if (isWithinNestedList($from, $to, listBlockRange)) {
    // If the selection is within a nested list, do nothing.
    return;
  }
  if (listBlockRange) {
    // If the selection spans exclusively a list at depth 1 lift the selected
    // items out and be done.
    liftListItem(itemType)(view.state, view.dispatch);
    return;
  }
  // If the selection is outside of a list, check if it is partially inside a list.
  const blockRange = $from.blockRange($to);
  for (
    let index = blockRange.startIndex;
    index < blockRange.endIndex;
    index += 1
  ) {
    if (isListBlock(blockRange.parent.child(index), [listType])) {
      // If the selection is partially inside a list, do nothing
      return;
    }
  }
  // If the selection is entirely outside a list, convert everything to a paragraph
  // so it can subsequently become a list
  swapTextBlock(view, schema.nodes.paragraph);
  wrapInList(listType)(view.state, view.dispatch);
};

export function containsNestedList(
  $from: ResolvedPos,
  $to: ResolvedPos,
  listBlockRange = getListBlockRange($from, $to),
): boolean {
  if (!listBlockRange) {
    return false;
  }
  let containsNestedList = false;
  const { doc } = $from;
  const $rangeStart = doc.resolve(listBlockRange.start);
  const $rangeEnd = doc.resolve(listBlockRange.end);
  listBlockRange.parent.nodesBetween(
    $rangeStart.parentOffset,
    $rangeEnd.parentOffset,
    (node) => {
      if (containsNestedList || node.isTextblock) {
        return false;
      }
      if (isListBlock(node)) {
        containsNestedList = true;
        return false;
      }
    },
  );
  return containsNestedList;
}

export function isWithinNestedList(
  $from: ResolvedPos,
  $to: ResolvedPos,
  listBlockRange = getListBlockRange($from, $to),
): boolean {
  if (!listBlockRange) {
    return false;
  }
  // The depth of the list item nodes within the listBlockRange will be 1 if
  // they are in a top level list.
  return listBlockRange.depth > 1;
}

export function indentListSelection(view: EditorView) {
  const result = sinkListItem(schema.nodes.list_item)(
    view.state,
    view.dispatch,
  );
  if (!result) return;

  const {
    $from: selection$from,
    $to: selection$to,
    $anchor: selection$anchor,
    $head: selection$head,
  } = view.state.selection;
  const listBlockRange = getListBlockRange(selection$from, selection$to);
  if (!listBlockRange) {
    return false;
  }

  // Store the user's original selection so they can be restored after we
  // execute more commands
  const LIST_ITEM_SELECTION_ANCHOR_KEY = 'listItemIndentSelectionAnchor';
  const LIST_ITEM_SELECTION_HEAD_KEY = 'listItemIndentSelectionHead';
  view.dispatch(
    view.state.tr.setMeta(positionMapperTransactionMetaKey, {
      addPositions: {
        [LIST_ITEM_SELECTION_ANCHOR_KEY]: selection$anchor.pos,
        [LIST_ITEM_SELECTION_HEAD_KEY]: selection$head.pos,
      },
    }),
  );

  outdentListBlockAfterPos(view, listBlockRange, selection$to.pos);

  const originalSelectionAnchor = getPositionMapperTransactionPositionsByKey(
    view.state,
    LIST_ITEM_SELECTION_ANCHOR_KEY,
  );
  const originalSelectionHead = getPositionMapperTransactionPositionsByKey(
    view.state,
    LIST_ITEM_SELECTION_HEAD_KEY,
  );
  view.dispatch(
    view.state.tr
      .setSelection(
        TextSelection.create(
          view.state.doc,
          originalSelectionAnchor as number,
          originalSelectionHead as number,
        ),
      )
      .setMeta(positionMapperTransactionMetaKey, {
        removePositions: [
          LIST_ITEM_SELECTION_ANCHOR_KEY,
          LIST_ITEM_SELECTION_HEAD_KEY,
        ],
      }),
  );
}
