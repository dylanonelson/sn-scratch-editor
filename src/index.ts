import { v4 as uuidv4 } from 'uuid';
import ComponentManager from 'sn-components-api';
import { baseKeymap } from 'prosemirror-commands';
import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin } from 'prosemirror-state';
import { history } from 'prosemirror-history';
import { inputRulesPlugin } from './inputRules';
import { ToolbarPlugin } from './ToolbarPlugin';
import { TooltipPlugin } from './TooltipPlugin';
import { EditorExtenderPlugin } from './EditorExtenderPlugin';
import { schema } from './schema';
import { client } from './client';
import { nodeViews } from './nodeViews';
import { keymapPlugins } from './keymaps';
import { markdownParser, markdownSerializer } from './markdown';

interface AppWindow extends Window {
  view: EditorView;
}

declare const window: AppWindow;

function getDocForNewEditorState() {
  return client.latestText
    ? markdownParser.parse(client.latestText)
    : client.latestDoc
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
          new TooltipPlugin(document.querySelector('#link-tooltip')),
          new EditorExtenderPlugin(document.querySelector('#extender')),
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
        if (tr.docChanged) {
          client.saveNote(
            next.doc.toJSON(),
            markdownSerializer.serialize(next.doc),
            next.doc.textBetween(0, next.doc.nodeSize - 2, ' '),
          );
        }
      },
    },
  ));

  client.onUpdate((doc) => {
    // When the user opens a new note, keep all the plugin instances except the toolbar
    const plugins = view.state.plugins.filter(
      (plugin) => plugin instanceof ToolbarPlugin === false,
    );

    view.setProps({
      state: EditorState.create({
        doc: getDocForNewEditorState(),
        plugins: [
          ...plugins,
          new ToolbarPlugin(
            document.querySelector('#toolbar'),
            document.querySelector('#link-modal'),
          ),
        ],
      }),
    });
  });
}

init();
