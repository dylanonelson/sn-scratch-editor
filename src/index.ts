import 'prosemirror-view/style/prosemirror.css';
import './index.html';
import './styles.css';
import './ext.json';
import './dev-ext.json';
import './assets/check_box-24px.svg';
import './assets/format_list_bulleted-24px.svg';
import './assets/format_size-24px.svg';
import './assets/notes-24px.svg';
import './assets/format_bold-24px.svg';
import './assets/format_italic-24px.svg';
import './assets/code-24px.svg';
import './assets/link-24px.svg';
import './assets/format_list_numbered-24px.svg';
import './assets/open_in_new-24px.svg';

import { v4 as uuidv4 } from 'uuid';
import ComponentManager from 'sn-components-api';
import { baseKeymap } from 'prosemirror-commands';
import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin } from 'prosemirror-state';
import { history } from 'prosemirror-history';
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

  const view = (window.view = new EditorView(
    document.querySelector('#editor'),
    {
      state: EditorState.create({
        doc: getDocForNewEditorState(),
        plugins: [
          ...keymapPlugins,
          new ToolbarPlugin(
            document.querySelector('#toolbar'),
            document.querySelector('#link-modal'),
          ),
          new Plugin({
            props: {
              nodeViews,
            },
          }),
          inputRulesPlugin,
          history(),
        ],
      }),
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        client.saveNote(next.doc.toJSON());
      },
    },
  ));

  client.onUpdate((doc) => {
    view.setProps({
      state: EditorState.create({
        doc: getDocForNewEditorState(),
        plugins: view.state.plugins,
      }),
    });
  });
}

init();
