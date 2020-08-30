import { CheckboxStatus, schema } from './schema';
import { EditorProps } from 'prosemirror-view';
import { CheckboxOutline, Checkbox } from './assets';

const CHECKBOX_CHECKED_CLASSNAME = 'is-checked';
const CLICK_TARGET_CLASSNAME = 'click-target';

export const nodeViews: EditorProps<typeof schema>['nodeViews'] = {
  checklist_item(node, view, getPos) {
    const div = document.createElement('div');
    div.classList.add('checklist-item');

    const inputDiv = document.createElement('div');
    inputDiv.classList.add('checkbox');
    if (node.attrs.status === CheckboxStatus.DONE) {
      inputDiv.classList.add(CHECKBOX_CHECKED_CLASSNAME);
      inputDiv.innerHTML = Checkbox;
    } else {
      inputDiv.innerHTML = CheckboxOutline;
    }

    const clickTargetDiv = document.createElement('div');
    clickTargetDiv.classList.add(CLICK_TARGET_CLASSNAME);
    clickTargetDiv.contentEditable = 'false';
    clickTargetDiv.tabIndex = 0;

    const p = document.createElement('p');

    clickTargetDiv.appendChild(inputDiv);
    div.appendChild(clickTargetDiv);
    div.appendChild(p);

    const focusHandler = (event: MouseEvent) => {
      const { relatedTarget, target } = event;
      if (clickTargetDiv.contains(relatedTarget as Node) === false) {
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
      if (clickTargetDiv.contains(event.target as Node) === false) {
        return;
      }
      const checked = inputDiv.classList.contains(CHECKBOX_CHECKED_CLASSNAME);
      const { tr } = view.state;
      const pos = (getPos as () => number)();
      tr.setNodeMarkup(pos, undefined, {
        status: checked ? CheckboxStatus.EMPTY : CheckboxStatus.DONE,
      });
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
