import { Plugin, EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import { MarkType, NodeType } from 'prosemirror-model';
import { RemoveMarkStep, findWrapping } from 'prosemirror-transform';
import { undo, redo } from 'prosemirror-history';
import { toggleMark } from 'prosemirror-commands';
import { AUTO_LINK_ATTR, schema } from './schema';
import { selectParentNode } from 'prosemirror-commands';
import { CheckboxStatus } from './schema';

const APPLY_FORMAT_ATTR = 'data-format';

type Command = typeof selectParentNode;

const toggleChecklistItemState: Command = function (
  state: EditorState,
  dispatch: EditorView['dispatch'],
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

type modalConfirmHandler = (params: { text: string; url: string }) => void;

class LinkModal {
  private el: Element;
  private frameEl: Element;
  private text: string;
  private url: string;
  private onConfirm: modalConfirmHandler;
  private onClear?: () => void;
  private showCls = 'active';

  constructor(
    el: Element,
    {
      onConfirm,
      onClear,
      text,
      url,
    }: {
      onClear?: () => void;
      onConfirm: modalConfirmHandler;
      text: string;
      url: string;
    },
  ) {
    this.el = el;
    this.textInput.value = this.text = text;
    this.urlInput.value = this.url = url;
    this.onConfirm = onConfirm;
    this.onClear = onClear;
    this.frameEl = el.querySelector('#frame');

    if (onClear) {
      this.clearBtn.classList.add(this.showCls);
    } else {
      this.clearBtn.classList.remove(this.showCls);
    }

    this.el.classList.add(this.showCls);
    this.confirmBtn.addEventListener('click', this.handleConfirm);
    this.cancelBtn.addEventListener('click', this.handleCancel);
    this.clearBtn.addEventListener('click', this.handleClear);
    document.addEventListener('keydown', this.handleGlobalKeydown);
    document.addEventListener('click', this.handleGlobalClick);
    this.urlInput.focus();
  }

  public destroy = () => {
    this.confirmBtn.removeEventListener('click', this.handleConfirm);
    this.cancelBtn.removeEventListener('click', this.handleCancel);
    this.clearBtn.removeEventListener('click', this.handleClear);
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    this.el.classList.remove(this.showCls);
  };

  private handleConfirm = () => {
    this.onConfirm({
      text: this.textInput.value,
      url: this.urlInput.value,
    });

    this.destroy();
  };

  private handleClear = () => {
    this.onClear();
    this.destroy();
  };

  private handleCancel = () => {
    this.destroy();
  };

  private handleGlobalKeydown = (e: KeyboardEvent) => {
    const isEnter = e.key === 'Enter';
    if (
      document.activeElement === this.textInput ||
      (document.activeElement === this.urlInput && isEnter)
    ) {
      this.handleConfirm();
      return;
    }
    const isEsc = e.key === 'Escape';
    if (isEsc) {
      this.handleCancel();
    }
  };

  private handleGlobalClick = (e: MouseEvent) => {
    if (this.frameEl.contains(e.target as HTMLElement) === false) {
      this.destroy();
    }
  };

  get textInput() {
    return this.el.querySelector('input#text') as HTMLInputElement;
  }

  get urlInput() {
    return this.el.querySelector('input#url') as HTMLInputElement;
  }

  get confirmBtn() {
    return this.el.querySelector('button#confirm');
  }

  get cancelBtn() {
    return this.el.querySelector('button#cancel');
  }

  get clearBtn() {
    return this.el.querySelector('button#clear');
  }
}

export class ToolbarPlugin extends Plugin {
  private view: EditorView;
  private modalEl: Element;
  private toolbarEl: Element;
  private modal: LinkModal;

  private swapTextBlock = (nodeType: NodeType) => {
    let { dispatch, state } = this.view;
    let { tr } = state;
    if (
      nodeType !== schema.nodes.unordered_list &&
      nodeType !== schema.nodes.ordered_list
    ) {
      liftListItem(schema.nodes.list_item)(state, dispatch);
    }
    ({ dispatch, state } = this.view);
    ({ tr } = state);
    const {
      selection: { from, to },
    } = state;
    tr.setBlockType(from, to, nodeType);
    dispatch(tr);
    this.view.focus();
  };

  private promoteHeading = (state: EditorState, dispatch) => {
    const { selection } = state;
    if (!selection.empty) {
      return;
    }
    const {
      $from: {
        parent: { type },
      },
    } = selection;
    let nextType: NodeType;
    if (type === schema.nodes.heading2) {
      nextType = schema.nodes.heading1;
    } else if (type === schema.nodes.heading3) {
      nextType = schema.nodes.heading2;
    } else if (type === schema.nodes.heading1) {
      nextType = schema.nodes.paragraph;
    } else {
      nextType = schema.nodes.heading3;
    }
    this.swapTextBlock(nextType);
  };

  private toggleList = (listType: NodeType, itemType: NodeType) => {
    const {
      state: {
        selection: { $from, $to },
        tr,
      },
    } = this.view;

    const listBlockRange = $from.blockRange(
      $to,
      (node) => node.type === listType,
    );
    if (listBlockRange) {
      const { dispatch, state } = this.view;
      // If the selection is entirely within a list lift the selected items out
      liftListItem(itemType)(state, dispatch);
      return;
    } else {
      const blockRange = $from.blockRange($to);
      for (
        let index = blockRange.startIndex;
        index < blockRange.endIndex;
        index += 1
      ) {
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
  };

  private toggleChecklistItem = () => {
    const { dispatch, state } = this.view;
    const { doc, tr } = state;
    const { $from, $to } = state.selection;
    const blockRange = $from.blockRange($to);

    for (
      let index = blockRange.startIndex;
      index < blockRange.endIndex;
      index += 1
    ) {
      if (blockRange.parent.child(index).type === schema.nodes.checklist_item) {
        this.swapTextBlock(schema.nodes.paragraph);
        return;
      }
    }
    this.swapTextBlock(schema.nodes.checklist_item);
  };

  private activateLinkModal: Command = (state, dispatch) => {
    const { doc, selection } = state;
    const { $from, $to } = selection;
    const linkMarkAtStart = $from
      .marks()
      .find(
        (mark) =>
          mark.type === schema.marks.link && !mark.attrs[AUTO_LINK_ATTR],
      );
    const linkMarkAtEnd = $to
      .marks()
      .find(
        (mark) =>
          mark.type === schema.marks.link && !mark.attrs[AUTO_LINK_ATTR],
      );
    const selectionIsInsideLink = linkMarkAtStart && linkMarkAtEnd;

    if (selection.empty && !selectionIsInsideLink) {
      return false;
    }
    if (linkMarkAtStart !== linkMarkAtEnd) {
      return false;
    }
    if (!dispatch) {
      return true;
    }

    const mark = linkMarkAtStart;
    let end, start, text, url;
    if (mark) {
      const textNode = $from.parent.nodeAt(
        $from.parentOffset - $from.textOffset,
      );
      start = $from.pos - $from.textOffset;
      end = start + textNode.nodeSize;
      text = textNode.text;
      url = mark.attrs.href;
      const newSelection = new TextSelection(
        doc.resolve(start),
        doc.resolve(end),
      );
      dispatch(state.tr.setSelection(newSelection));
    } else {
      end = $to.pos;
      start = $from.pos;
      text = state.doc.textBetween($from.pos, $to.pos);
      url = '';
    }

    const onClear =
      mark &&
      (() =>
        this.view.dispatch(
          this.view.state.tr.step(new RemoveMarkStep(start, end, mark)),
        ));

    this.modal = new LinkModal(this.modalEl, {
      onClear,
      onConfirm: ({ text, url }) => {
        const mark = schema.marks.link.create({ href: url });
        const textNode = schema.text(text, [mark]);
        this.view.dispatch(
          this.view.state.tr.replaceSelectionWith(textNode, false),
        );
      },
      text,
      url,
    });

    return true;
  };

  private toggleMark = (mark: MarkType) => {
    toggleMark(mark)(this.view.state, this.view.dispatch);
    this.view.focus();
  };

  constructor(toolbarEl: Element, modalEl: Element) {
    super({
      view: (viewInstance) => {
        this.view = viewInstance;
        this.modalEl = modalEl;
        this.toolbarEl = toolbarEl;

        toolbarEl.addEventListener('click', this.handleToolbarClick);

        return {
          destroy: () => {
            toolbarEl.removeEventListener('click', this.handleToolbarClick);
            this.unhighlightSelectedAttrs();
            this.modal?.destroy();
          },
          update: (view, previousState) => {
            this.unhighlightSelectedAttrs();
            this.highlightSelectedAttrs(view.state);
          },
        };
      },
      props: {
        handleKeyDown: (_view, e) => {
          const hasCtrl = e.ctrlKey;
          const hasMod = e.metaKey;

          if (hasCtrl && e.key === 't') {
            this.toggleChecklistItem();
            return true;
          }

          if (hasMod && e.key === '7') {
            this.toggleList(
              schema.nodes.unordered_list,
              schema.nodes.list_item,
            );
            return true;
          }

          if (hasCtrl && e.key === 'u') {
            this.toggleList(
              schema.nodes.unordered_list,
              schema.nodes.list_item,
            );
            return true;
          }

          if (hasCtrl && e.key === 'o') {
            this.toggleList(schema.nodes.ordered_list, schema.nodes.list_item);
            return true;
          }

          if (hasCtrl && e.key === '=') {
            this.promoteHeading(this.view.state, this.view.dispatch);
            return true;
          }

          if (hasCtrl && e.key === 'j') {
            this.swapTextBlock(schema.nodes.paragraph);
            return true;
          }

          if (hasCtrl && e.code === 'Space') {
            return toggleChecklistItemState(
              this.view.state,
              this.view.dispatch,
            );
          }

          if (hasMod && e.key === 'z') {
            return undo(this.view.state, this.view.dispatch);
          }

          if (hasMod && e.key === 'y') {
            return redo(this.view.state, this.view.dispatch);
          }

          if (hasMod && e.key === 'i') {
            this.toggleMark(schema.marks.em);
            return true;
          }

          if (hasMod && e.key === 'b') {
            this.toggleMark(schema.marks.strong);
            return true;
          }

          if (hasCtrl && e.key === "'") {
            this.toggleMark(schema.marks.code);
            return true;
          }

          if (hasMod && e.key === 'k') {
            this.activateLinkModal(this.view.state, this.view.dispatch);
            return true;
          }

          return false;
        },
      },
    });
  }

  unhighlightSelectedAttrs = () => {
    const selectedBtns = this.toolbarEl.querySelectorAll('.selected');
    selectedBtns.forEach((btn) => {
      btn.classList.remove('selected');
    });
  };

  highlightSelectedAttrs = (state: EditorState) => {
    const selectedAttrs = this.getSelectedFormatAttrs(state);
    if (selectedAttrs) {
      selectedAttrs.forEach((attr) => {
        const btn = this.toolbarEl.querySelector(`[data-format=${attr}]`);
        if (btn) {
          btn.classList.add('selected');
        }
      });
    }
  };

  getSelectedFormatAndMarks = (state: EditorState) => {
    if (!state.selection) {
      return;
    }

    const result = [];

    const { $from, $to } = state.selection;
    const blockRange = $from.blockRange(
      $to,
      (node) => node.type !== schema.nodes.list_item,
    );

    let selected = null;
    for (
      let index = blockRange.startIndex;
      index < blockRange.endIndex;
      index += 1
    ) {
      const child = blockRange.parent.child(index);
      const currentType =
        child.type === schema.nodes.list_item
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

    let marks = $from.pos === $to.pos ? $from.marks() : $from.marksAcross($to);
    if (state.selection.empty && state.storedMarks) {
      marks = state.storedMarks;
    }

    if (marks) {
      result.push(...marks.map((mark) => mark.type));
    }

    return result;
  };

  getSelectedFormatAttrs = (state: EditorState) => {
    const [nodeType, ...markTypes] = this.getSelectedFormatAndMarks(state);
    const result = [];

    let activeBtnAttr = null;
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
    markTypes.forEach((markType) => {
      switch (markType) {
        case schema.marks.link: {
          result.push('link');
          break;
        }
        case schema.marks.inline_link: {
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
  };

  handleToolbarClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest(`[${APPLY_FORMAT_ATTR}]`);
    if (button) {
      e.stopPropagation();
      this.applyFormat(button.getAttribute(APPLY_FORMAT_ATTR));
    }
  };

  applyFormat = (dataFormatStr: string) => {
    switch (dataFormatStr) {
      case 'undo': {
        undo(this.view.state, this.view.dispatch);
        break;
      }
      case 'redo': {
        redo(this.view.state, this.view.dispatch);
        break;
      }
      case 'paragraph': {
        this.swapTextBlock(schema.nodes.paragraph);
        break;
      }
      case 'code_block': {
        this.swapTextBlock(schema.nodes.code_block);
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
      case 'link': {
        this.activateLinkModal(this.view.state, this.view.dispatch);
        break;
      }
      default: {
        // do nothing
      }
    }
  };
}
