import { schema } from './schema';
import { EditorProps } from 'prosemirror-view';
import { CheckBoxOutline, CheckBox } from './assets';

const CHECKBOX_CHECKED_CLASSNAME = 'is-checked';

export const nodeViews: EditorProps<typeof schema>['nodeViews'] = {
  checklist_item(node, view, getPos) {
    const div = document.createElement('div');
    div.classList.add('checklist-item');

    const inputDiv = document.createElement('div');
    inputDiv.classList.add('checkbox');
    if (node.attrs.checked) {
      inputDiv.classList.add(CHECKBOX_CHECKED_CLASSNAME);
      inputDiv.innerHTML = CheckBox;
    } else {
      inputDiv.innerHTML = CheckBoxOutline;
    }
    inputDiv.contentEditable = 'false';

    const p = document.createElement('p');

    div.appendChild(inputDiv);
    div.appendChild(p);

    const focusHandler = (event: MouseEvent) => {
      const { relatedTarget, target } = event;
      if (relatedTarget !== inputDiv) {
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
      if (inputDiv.contains(event.target as Node) === false) {
        return;
      }
      const checked = inputDiv.classList.contains(CHECKBOX_CHECKED_CLASSNAME);
      const { tr } = view.state;
      const pos = (getPos as () => number)();
      tr.setNodeMarkup(pos, undefined, { checked: !checked })
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
