import { Plugin, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view';
import { ResolvedPos } from 'prosemirror-model';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import { Schema, NodeType, NodeRange } from 'prosemirror-model';
import { findWrapping } from 'prosemirror-transform';
import { schema } from './schema';
import {
  chainCommands,
  selectParentNode,
  setBlockType,
  wrapIn,
} from 'prosemirror-commands';

const APPLY_FORMAT_ATTR = 'data-format';

type Command = typeof selectParentNode;

const toggleChecklistItemState: Command = function (state: EditorState, dispatch: EditorView['dispatch']) {
  const { $from, $to } = state.selection;

  const blockRange = $from.blockRange($to);

  let hasChecked = false
  for (
    let index = blockRange.startIndex,
      child = blockRange.parent.child(index);
    index < blockRange.endIndex;
    index += 1
  ) {
    if (child.type !== schema.nodes.checklist_item) {
      return false;
    }
    if (child.attrs.checked) {
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
    tr.setNodeMarkup(pos, undefined, { checked: hasChecked ? false : true });
    pos += child.nodeSize;
  }


  dispatch(tr);
  return true;
}

export class ToolbarPlugin extends Plugin {
  private view: EditorView;

  private swapTextBlock = (nodeType: NodeType) => {
    let { dispatch, state } = this.view;
    let { tr } = state;
    const { $from, $to, from, to } = state.selection;
    if (nodeType !== schema.nodes.unordered_list) {
      liftListItem(schema.nodes.list_item)(state, dispatch);
    }
    ({ dispatch, state } = this.view);
    ({ tr } = state);
    tr.setBlockType(from, to, nodeType);
    dispatch(tr);
    this.view.focus();
  }

  private promoteHeading = (state: EditorState, dispatch) => {
    const { selection } = state;
    if (!selection.empty) {
      return;
    }
    const { $from: { parent: { type } } } = selection;
    let nextType: NodeType;
    if (type === schema.nodes.heading2) {
      nextType = schema.nodes.heading1;
    } else if (type === schema.nodes.heading1) {
      nextType = schema.nodes.paragraph;
    } else {
      nextType = schema.nodes.heading2;
    }
    this.swapTextBlock(nextType);
  }

  private toggleList = (listType: NodeType, itemType: NodeType) => {
    const { state:  { selection: { $from, $to }, tr } } = this.view;

    const listBlockRange = $from.blockRange($to, node => node.type === listType);
    if (listBlockRange) {
      const { dispatch, state } = this.view;
      // If the selection is entirely within a list lift the selected items out
      liftListItem(itemType)(state, dispatch);
      return;
    } else {
      const blockRange = $from.blockRange($to);
      for (let index = blockRange.startIndex; index < blockRange.endIndex; index += 1) {
        if (blockRange.parent.child(index).type === listType) {
          // If the selection is partially inside a list, do nothing
          return;
        }
      }
      // If the selection is entirely outside a list, convert everything to a paragraph
      // so it can subsequently become a list
      this.swapTextBlock(schema.nodes.paragraph);
      const { dispatch, state } = this.view;
      wrapInList(schema.nodes.unordered_list)(state, dispatch);
    }
  }

  private toggleChecklistItem = () => {
    const { dispatch, state } = this.view;
    const { doc, tr } = state;
    const { $from, $to } = state.selection;
    const blockRange = $from.blockRange($to);

    for (let index = blockRange.startIndex; index < blockRange.endIndex; index += 1) {
      if (blockRange.parent.child(index).type === schema.nodes.checklist_item) {
        this.swapTextBlock(schema.nodes.paragraph);
        return;
      }
    }
    this.swapTextBlock(schema.nodes.checklist_item);
  };

  constructor(el: Element) {
    super({
      view: (viewInstance) => {
        this.view = viewInstance;
        el.addEventListener('click', this.handleToolbarClick);
        return {
          destroy() {
            el.removeEventListener('click', this.handleToolbarClick);
          },
          update: (view, previousState) => {
            const previousSelectedFormat = this.getSelectedFormatAttr(previousState);
            if (previousSelectedFormat) {
              el.querySelector(`[data-format=${previousSelectedFormat}]`).classList.remove('selected');
            }

            const selectedFormat = this.getSelectedFormatAttr(view.state);
            if (selectedFormat) {
              el.querySelector(`[data-format=${selectedFormat}]`).classList.add('selected');
            }
          }
        };
      },
      props: {
        handleKeyDown: (view, e) => {
          const isT = e.which === 84;
          const hasCtrl = e.ctrlKey;
          if (isT && hasCtrl) {
            this.toggleChecklistItem();
            return true;
          }

          const is7 = e.which === 55;
          const hasMod = e.metaKey;
          if (is7 && hasMod) {
            this.toggleList(schema.nodes.unordered_list, schema.nodes.list_item);
            return true;
          }

          const isU = e.which === 85;
          if (isU && hasCtrl) {
            this.toggleList(schema.nodes.unordered_list, schema.nodes.list_item);
            return true;
          }

          const isPlus = e.which === 187;
          if (isPlus && hasCtrl) {
            this.promoteHeading(this.view.state, this.view.dispatch);
            return true;
          }

          const isJ = e.which === 74;
          if (isJ && hasCtrl) {
            this.swapTextBlock(schema.nodes.paragraph);
            return true;
          }

          const isSpace = e.which === 32;
          if (hasCtrl && isSpace) {
            return toggleChecklistItemState(this.view.state, this.view.dispatch);
          }

          return false;
        }
      },
    });
  }

  getSelectedFormat = (state: EditorState) => {
    if (!state.selection) {
      return;
    }

    const zeroDepthBlockRange = new NodeRange(state.selection.$from, state.selection.$to, 0);

    let selected = null;
    for (let index = zeroDepthBlockRange.startIndex; index < zeroDepthBlockRange.endIndex; index += 1) {
      const currentType = zeroDepthBlockRange.parent.child(index).type;
      if (selected === null) {
        selected = currentType;
        continue;
      }
      if (selected !== currentType) {
        return null;
      }
    }
    return selected;
  }

  getSelectedFormatAttr = (state: EditorState) => {
    const nodeType = this.getSelectedFormat(state);

    let activeBtnAttr = null;;
    switch (nodeType) {
      case schema.nodes.heading1:
      case schema.nodes.heading2: {
        activeBtnAttr = 'heading';
        break;
      }
      case schema.nodes.paragraph: {
        activeBtnAttr = 'paragraph';
        break;
      }
      case schema.nodes.unordered_list:
      case schema.nodes.list_item: {
        activeBtnAttr = 'unordered_list';
        break;
      }
      case schema.nodes.checklist_item: {
        activeBtnAttr = 'checklist_item';
        break;
      }
      default: {
        // do nothing
      }
    }
    return activeBtnAttr;
  }

  handleToolbarClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest(`[${APPLY_FORMAT_ATTR}]`);
    if (button) {
      this.applyFormat(button.getAttribute(APPLY_FORMAT_ATTR));
    }
  }

  applyFormat = (dataFormatStr: string) => {
    switch (dataFormatStr) {
      case 'paragraph': {
        this.swapTextBlock(schema.nodes.paragraph);
        break;
      }
      case 'heading': {
        this.promoteHeading(this.view.state, this.view.dispatch);
        break;
      }
      case 'unordered_list': {
        this.toggleList(schema.nodes.unordered_list, schema.nodes.list_item);
        break;
      }
      case 'checklist_item': {
        this.toggleChecklistItem();
        break;
      }
      default: {
        // do nothing
      }
    }
  }
}
