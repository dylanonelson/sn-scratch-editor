import { EditorState, Plugin, Selection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { schema } from './schema';

export const keymapPlugins: Plugin[] = [
  keymap({
    Enter: splitListItem(schema.nodes.list_item),
  }),
  keymap({
    Enter(state, dispatch) {
      const {selection, tr} = state;
      const {  $from, from } = selection;
      if ($from.parent.type !== schema.nodes.checklist_item) {
        return false;
      }
      tr.deleteSelection();
      const next$From = tr.doc.resolve(from);
      if (next$From.parent.nodeSize === 2){
        const nextFrom = next$From.pos;
        // The node is empty
        tr.replaceWith(nextFrom - 1, nextFrom + 1, schema.nodes.paragraph.createAndFill());
        tr.setSelection(Selection.near(tr.doc.resolve(nextFrom - 1)));
        dispatch(tr);
        return true;
      }
      tr.split(from, undefined, [{
        type: schema.nodes.checklist_item,
      }]);
      dispatch(tr);
      return true;
    },
  }),
  keymap(baseKeymap),
];
