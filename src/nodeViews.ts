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

    const focusHandler = (event: MouseEvent) => {
      const { relatedTarget, target } = event;
      if (relatedTarget !== input) {
        // Input is taking focus
        return;
      }

      const viewHasFocus = target === view.dom;
      if (viewHasFocus) {
        // The view was focused before the input
        view.focus();
      }
    };

    const clickHandler = (event: MouseEvent) => {
      if (event.target !== input) {
        return;
      }
      const checked = input.checked;
      const { tr } = view.state;
      const pos = (getPos as () => number)();
      tr.setNodeMarkup(pos, undefined, { checked })
      view.dispatch(tr);
    };

    view.dom.addEventListener('blur', focusHandler);
    view.dom.addEventListener('click', clickHandler);

    return {
      dom: div,
      contentDOM: p,
      destroy() {
        view.dom.removeEventListener('blur', focusHandler);
        view.dom.removeEventListener('click', clickHandler);
      },
    };
  },
};
