import { debounce } from 'es-toolkit';
import { history } from 'prosemirror-history';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { client } from './client';
import { EditorExtenderPlugin } from './EditorExtenderPlugin';
import { InlineLinkPlugin } from './InlineLinkPlugin';
import { inputRulesForcedSpacePlugin, inputRulesPlugin } from './inputRules';
import { JoinListsPlugin } from './JoinListsPlugin';
import { keymapPlugins } from './keymaps';
import { markdownParser, markdownSerializer } from './markdown';
import { nodeViews } from './nodeViews';
import { schema } from './schema';
import { ToolbarPlugin } from './ToolbarPlugin';
import { TooltipPlugin } from './TooltipPlugin';

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

  const debouncedSave = debounce((doc: ProsemirrorNode) => {
    client.saveNote(
      doc.toJSON(),
      markdownSerializer.serialize(doc),
      doc.textBetween(0, doc.nodeSize - 2, ' '),
    );
  }, 850);

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
          new InlineLinkPlugin(),
          new JoinListsPlugin(),
          inputRulesPlugin,
          inputRulesForcedSpacePlugin,
          history(),
        ],
      }),
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        if (tr.docChanged) {
          debouncedSave(next.doc);
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
