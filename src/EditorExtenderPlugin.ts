import { Plugin, Selection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema } from './schema';

export class EditorExtenderPlugin extends Plugin {
  private view: EditorView;
  private el: HTMLDivElement;

  constructor(extenderEl: HTMLDivElement) {
    super({
      view: (viewInstance) => {
        this.view = viewInstance;
        this.el = extenderEl;

        this.el.addEventListener('click', this.handleClick);

        return {
          destroy: () => {
            this.el.removeEventListener('click', this.handleClick);
          },
        };
      },
    });
  }

  handleClick = () => {
    const { state } = this.view;
    const { doc, tr } = state;
    const lastPos = doc.nodeSize - 2;
    const lastNodeType = state.doc.lastChild.type;
    if (lastNodeType === schema.nodes.code_block || lastNodeType.isLeaf) {
      tr.insert(lastPos, schema.nodes.paragraph.createAndFill());
    }
    tr.setSelection(Selection.atEnd(tr.doc));
    this.view.dispatch(tr);
    this.view.focus();
  };
}
