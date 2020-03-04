import './styles.css';
import 'prosemirror-view/style/prosemirror.css'
import ComponentManager from 'sn-components-api';
import { baseKeymap } from 'prosemirror-commands';
import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin } from 'prosemirror-state';
import { DOMParser } from 'prosemirror-model';
import { inputRulesPlugin } from './inputRules';
import { ToolbarPlugin } from './ToolbarPlugin';
import { schema } from './schema';
import { nodeViews } from './nodeViews';
import { keymapPlugins } from './keymaps';
import aliceDocNode from './sample-docs/alice.html';
import taskDocNode from './sample-docs/task.html';

interface AppWindow extends Window {
  view: EditorView;
}

declare const window: AppWindow;

function getInitialDoc() {
  if (process.env.NODE_ENV !== 'production') {
    return DOMParser.fromSchema(schema)
      .parse(taskDocNode as unknown as Node);
  }
  return schema.nodes.doc.create({}, schema.nodes.paragraph.createAndFill());
}

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
        doc: getInitialDoc(),
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
    },
  );
}

init();
