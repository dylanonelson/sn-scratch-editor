import './styles.css';
import 'prosemirror-view/style/prosemirror.css'
import ComponentManager from 'sn-components-api';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { splitListItem } from 'prosemirror-schema-list';
import { ToolbarPlugin } from './ToolbarPlugin';
import { schema } from './schema';

interface AppWindow extends Window {
  view: EditorView;
}

declare const window: AppWindow;

function init() {
  const componentManager = new ComponentManager([
    {
      name: 'stream-context-item',
    }
  ]);

  const view = window.view = new EditorView(
    document.querySelector('#editor'),
    {
      state: EditorState.create({
        doc: schema.nodes.doc.create({}, schema.nodes.paragraph.createAndFill()),
        plugins: [
          keymap({
            'Enter': splitListItem(schema.nodes.bullet_list)
          }),
          keymap(baseKeymap),
          new ToolbarPlugin(document.querySelector('#toolbar')),
        ],
      }),
    },
  );
}

init();
