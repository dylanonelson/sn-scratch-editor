import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { schema } from './schema';

export const keymapPlugins: Plugin[] = [
  keymap({
    Enter: splitListItem(schema.nodes.list_item),
    'Shift-Tab': liftListItem(schema.nodes.list_item),
    Tab: sinkListItem(schema.nodes.list_item),
  }),
  keymap({
    Enter(state, dispatch) {
      const { selection: { $from, from }, tr } = state;
      if ($from.parent.type !== schema.nodes.checklist_item) {
        return false;
      }
      tr.deleteSelection();
      const next$From = tr.doc.resolve(from);
      if (next$From.parent.nodeSize === 2){
        const nextFrom = next$From.pos;
        // The node is empty
        tr.replaceWith(nextFrom - 1, nextFrom + 1, schema.nodes.paragraph.createAndFill());
        dispatch(tr);
        return true;
      }
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
