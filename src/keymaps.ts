import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { splitListItem } from 'prosemirror-schema-list';
import { schema } from './schema';

export const keymapPlugins: Plugin[] = [
  keymap({
    Enter: splitListItem(schema.nodes.bullet_list)
  }),
  keymap({
    Enter: (state, dispatch) => {
      const { selection: { $from, from }, tr } = state;
      if ($from.parent.type !== schema.nodes.checklist_item) {
        return false;
      }
      tr.deleteSelection();
      tr.split(from, undefined, [{
        type: schema.nodes.checklist_item,
        attrs: { checked: false }
      }]);
      dispatch(tr);
      return true;
    },
  }),
  keymap(baseKeymap),
];
