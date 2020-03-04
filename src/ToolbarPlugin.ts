import { Plugin, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import { Schema, NodeType, NodeRange } from 'prosemirror-model';
import { findWrapping } from 'prosemirror-transform';
import { schema } from './schema';
import { chainCommands, selectParentNode, wrapIn, setBlockType } from 'prosemirror-commands';

const APPLY_FORMAT_ATTR = 'data-format';

export class ToolbarPlugin extends Plugin {
  private view: EditorView;

  private swapTextBlock = (nodeType: NodeType) => {
    const { dispatch, state } = this.view;
    const { tr } = state;
    const { from, to } = state.selection;
    tr.setBlockType(from, to, nodeType);
    dispatch(tr);
    this.view.focus();
  }

  private toggleList = (listType: NodeType, itemType: NodeType) => {
    const { dispatch, state } = this.view;

    chainCommands(
      wrapInList(listType),
      liftListItem(itemType),
    )(state, dispatch);
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

          return false;
        }
      }
    });
  }

  handleToolbarClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute(APPLY_FORMAT_ATTR)) {
      this.applyFormat(target.getAttribute(APPLY_FORMAT_ATTR));
    }
  }

  applyFormat = (dataFormatStr: string) => {
    switch (dataFormatStr) {
      case 'paragraph': {
        this.swapTextBlock(schema.nodes.paragraph);
        break;
      }
      case 'heading1': {
        this.swapTextBlock(schema.nodes.heading1);
        break;
      }
      case 'heading2': {
        this.swapTextBlock(schema.nodes.heading2);
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
