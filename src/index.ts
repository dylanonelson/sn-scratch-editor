import './styles.css';
import 'prosemirror-view/style/prosemirror.css'
import { v4 as uuidv4 } from 'uuid';
import ComponentManager from 'sn-components-api';
import { baseKeymap } from 'prosemirror-commands';
import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin } from 'prosemirror-state';
import { inputRulesPlugin } from './inputRules';
import { ToolbarPlugin } from './ToolbarPlugin';
import { schema } from './schema';
import { client } from './client';
import { nodeViews } from './nodeViews';
import { keymapPlugins } from './keymaps';

interface AppWindow extends Window {
  view: EditorView;
}

declare const window: AppWindow;

function getDocForNewEditorState() {
  return client.latestDoc
    ? schema.nodeFromJSON(client.latestDoc)
    : schema.topNodeType.createAndFill();
}

async function init() {
  await client.ready();

  const view = window.view = new EditorView(
    document.querySelector('#editor'),
    {
      state: EditorState.create({
        doc: getDocForNewEditorState(),
        plugins: [
          ...keymapPlugins,
          new ToolbarPlugin(document.querySelector('#toolbar')),
          new Plugin({
            props: {
              nodeViews
            },
          }),
          inputRulesPlugin,
        ],
      }),
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        client.saveNote(next.doc.toJSON());
      },
    },
  );

  client.onUpdate(doc => {
    view.setProps({
      state: EditorState.create({
        doc: getDocForNewEditorState(),
        plugins: view.state.plugins,
      }),
    });
  });
}

init();
