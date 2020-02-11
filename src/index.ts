import './styles.css';
import 'prosemirror-view/style/prosemirror.css'
import * as ComponentManager from 'sn-components-api';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { schema } from './schema';

/**
* heading1
* paragraphs
* lists
* todos
*
* links
* bold
*/

interface AppWindow extends Window {
  view: EditorView;
}

declare const window: AppWindow;

function init() {
  // const componentManager = new ComponentManager();

  const view = window.view = new EditorView(
    document.querySelector('#root'),
    {
      state: EditorState.create({
        doc: schema.topNodeType.createAndFill(),
        plugins: [
          keymap(baseKeymap),
        ],
      }),
    },
  );
}

init();
