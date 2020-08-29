import { ResolvedPos } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import {
  Plugin,
  EditorState,
  Selection,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import { schema } from './schema';

const SHOW_CLS = 'show';

export class TooltipPlugin extends Plugin {
  private rootEl: HTMLDivElement;
  private tooltipEl: HTMLDivElement;
  private view: EditorView;
  private txt: string;

  constructor(el: HTMLDivElement, rootEl: HTMLDivElement) {
    super({
      view: (viewInstance) => {
        this.view = viewInstance;
        return {
          destroy: () => {
            this.hide();
          },
          update: (view, previousState) => {
            this.checkSelection();
          },
        };
      },
    });

    this.rootEl = rootEl;
    this.tooltipEl = el;
  }

  private checkSelection = () => {
    const selection: TextSelection = this.view.state.selection;
    const { $cursor } = selection;

    const withinLink = Boolean(
      $cursor &&
        $cursor.nodeBefore &&
        $cursor.nodeAfter &&
        $cursor.nodeBefore.marks.some(
          (mark) => mark.type === schema.marks.link,
        ) &&
        $cursor.nodeAfter.marks.some((mark) => mark.type === schema.marks.link),
    );

    if (withinLink === false) {
      this.hide();
      return;
    }

    const mark = $cursor.nodeBefore.marks.find(
      (mark) => mark.type === schema.marks.link,
    );

    this.show($cursor, mark.attrs.href);
  };

  private hide = () => {
    this.tooltipEl.classList.remove(SHOW_CLS);
  };

  private show = ($pos: ResolvedPos, url: string) => {
    const { left, top } = this.view.coordsAtPos($pos.pos);
    this.linkTextEl.innerText = url;
    this.anchorEl.href = url;
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top - 36 + this.rootEl.scrollTop}px`;
    this.tooltipEl.classList.add(SHOW_CLS);
  };

  get linkTextEl(): HTMLSpanElement {
    return this.tooltipEl.querySelector('div.text');
  }

  get anchorEl(): HTMLAnchorElement {
    return this.tooltipEl.querySelector('a.link-anchor');
  }
}
