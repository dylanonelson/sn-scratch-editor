import { Plugin, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import { Schema, NodeType } from 'prosemirror-model';
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
    const { tr } = state;
    const { $from, $to } = state.selection;
    tr.wrap(
      $from.blockRange($to),
      findWrapping($from.blockRange($to), itemType),
    );
    dispatch(tr);
  }

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
        handleKeyDown(view, e) {
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
      }
      case 'heading1': {
        this.swapTextBlock(schema.nodes.heading1);
        break;
      }
      case 'heading2': {
        this.swapTextBlock(schema.nodes.heading2);
        break;
      }
      case 'bullet_list': {
        this.toggleList(schema.nodes.bullet_list, schema.nodes.list_item);
        break;
      }
      default: {
        // do nothing
      }
    }
  }
}
