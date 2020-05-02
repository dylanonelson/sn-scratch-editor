import { schema } from './schema';
import { EditorProps } from 'prosemirror-view';
import { CheckBoxOutline, CheckBox } from './assets';

const CHECKBOX_CHECKED_CLASSNAME = 'is-checked';

export const nodeViews: EditorProps<typeof schema>['nodeViews'] = {
  checklist_item(node, view, getPos) {
    const div = document.createElement('div');
    div.classList.add('checklist-item');

    const inputSpan = document.createElement('span');
    inputSpan.classList.add('checkbox');
    console.log(node.attrs);
    if (node.attrs.checked) {
      inputSpan.classList.add(CHECKBOX_CHECKED_CLASSNAME);
      inputSpan.innerHTML = CheckBox;
    } else {
      inputSpan.innerHTML = CheckBoxOutline;
    }
    inputSpan.contentEditable = 'false';

    const p = document.createElement('p');

    div.appendChild(inputSpan);
    div.appendChild(p);

    const focusHandler = (event: MouseEvent) => {
      const { relatedTarget, target } = event;
      if (relatedTarget !== inputSpan) {
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
      if (inputSpan.contains(event.target as Node) === false) {
        return;
      }
      const checked = inputSpan.classList.contains(CHECKBOX_CHECKED_CLASSNAME);
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
