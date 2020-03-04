import { schema } from './schema';
import { EditorProps } from 'prosemirror-view';

export const nodeViews: EditorProps<typeof schema>['nodeViews'] = {
  checklist_item(node, view, getPos) {
    const div = document.createElement('div');
    div.classList.add('checklist-item');


    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = node.attrs.checked;
    input.contentEditable = 'false';

    const p = document.createElement('p');

    div.appendChild(input);
    div.appendChild(p);

    const handler = () => {
      const checked = input.checked;
      const { tr } = view.state;
      const pos = (getPos as () => number)();
      view.dispatch(tr.setNodeMarkup(pos, undefined, { checked }));
    };

    input.addEventListener('click', handler);

    return {
      dom: div,
      contentDOM: p,
      destroy() {
        input.removeEventListener('click', handler);
      },
    };
  },
};
