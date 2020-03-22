import { Plugin, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import {
  MarkType,
  NodeRange,
  NodeType,
  ResolvedPos,
  Schema,
} from 'prosemirror-model';
import { findWrapping } from 'prosemirror-transform';
import { undo, redo } from 'prosemirror-history';
import { toggleMark } from 'prosemirror-commands';
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
      wrapInList(listType)(state, dispatch);
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
  }

  private activateLinkModal = () => {
  }

  private toggleMark = (mark: MarkType) => {
    toggleMark(mark)(this.view.state, this.view.dispatch);
    this.view.focus();
  }

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
            const previouslySelectedAttrs = this.getSelectedFormatAttrs(previousState);
            if (previouslySelectedAttrs) {
              previouslySelectedAttrs.forEach(attr => {
                const btn = el.querySelector(`[data-format=${attr}]`);
                if (btn) {
                  btn.classList.remove('selected');
                }
              });
            }

            const selectedAttrs = this.getSelectedFormatAttrs(view.state);
            if (selectedAttrs) {
              selectedAttrs.forEach(attr => {
                const btn = el.querySelector(`[data-format=${attr}]`);
                if (btn) {
                  btn.classList.add('selected');
                }
              });
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

          const isO = e.which === 79;
          if (isO && hasCtrl) {
            this.toggleList(schema.nodes.ordered_list, schema.nodes.list_item);
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

          const isZ = e.which === 90;
          if (hasMod && isZ) {
            return undo(this.view.state, this.view.dispatch);
          }

          const isY = e.which === 89;
          if (hasMod && isY) {
            return redo(this.view.state, this.view.dispatch);
          }

          const isI = e.which === 73;
          if (hasMod && isI) {
            this.toggleMark(schema.marks.em);
            return true;
          }

          const isB = e.which === 66;
          if (hasMod && isB) {
            this.toggleMark(schema.marks.strong);
            return true;
          }

          const isPrime = e.which === 222;
          if (hasMod && isPrime) {
            this.toggleMark(schema.marks.code);
            return true;
          }

          const isK = e.which === 75;
          if (hasMod && isK) {
            this.activateLinkModal();
            return true;
          }

          return false;
        }
      },
    });
  }

  getSelectedFormatAndMarks = (state: EditorState) => {
    if (!state.selection) {
      return;
    }

    const result = []

    const { $from, $to, content } = state.selection;
    const blockRange = $from.blockRange($to, node => node.type !== schema.nodes.list_item);

    let selected = null;
    for (
      let index = blockRange.startIndex; index < blockRange.endIndex; index += 1
    ) {
      const child = blockRange.parent.child(index);
      const currentType = child.type === schema.nodes.list_item
        ? blockRange.parent.type
        : child.type;

      if (selected === null) {
        selected = currentType;
        continue;
      }
      if (selected !== currentType) {
        selected = null;
        break;
      }
    }
    result.push(selected);

    const marks = $from.marksAcross($to);
    if (marks) {
      result.push(...marks.map(mark => mark.type));
    }

    return result;
  }

  getSelectedFormatAttrs = (state: EditorState) => {
    const [nodeType, ...markTypes] = this.getSelectedFormatAndMarks(state);
    const result = [];

    let activeBtnAttr = null;;
    switch (nodeType) {
      case schema.nodes.heading1:
      case schema.nodes.heading2: {
        result.push('heading');
        break;
      }
      case schema.nodes.paragraph: {
        result.push('paragraph');
        break;
      }
      case schema.nodes.unordered_list: {
        result.push('unordered_list');
        break;
      }
      case schema.nodes.ordered_list: {
        result.push('ordered_list');
        break;
      }
      case schema.nodes.checklist_item: {
        result.push('checklist_item');
        break;
      }
      default: {
        result.push(null);
      }
    }
    markTypes.forEach(markType => {
      switch (markType) {
        case schema.marks.link: {
          result.push('link');
          break;
        }
        case schema.marks.em: {
          result.push('em');
          break;
        }
        case schema.marks.strong: {
          result.push('strong');
          break;
        }
        case schema.marks.code: {
          result.push('code');
          break;
        }
      }
    });

    return result;
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
      case 'ordered_list': {
        this.toggleList(schema.nodes.ordered_list, schema.nodes.list_item);
        break;
      }
      case 'checklist_item': {
        this.toggleChecklistItem();
        break;
      }
      case 'strong':
      case 'em':
      case 'code': {
        this.toggleMark(schema.marks[dataFormatStr]);
        break;
      }
      default: {
        // do nothing
      }
    }
  }
}
