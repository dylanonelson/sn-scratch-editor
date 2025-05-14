import { EditorState } from "prosemirror-state";
import { schema } from "./schema";
import { builders } from "prosemirror-test-builder";
import { inputRulesPlugin } from "./inputRules";
import { EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";

const schemaHelpers = builders(schema, {});

const createEditorViewWithInputRules = (...content: Node[]) => {
    const doc = schemaHelpers.doc(...content);
    const editorState = EditorState.create({doc, schema, plugins: [inputRulesPlugin]});
    const view = new EditorView(document.createElement('div'), {
        state: editorState,
        dispatchTransaction: (tr) => {
            view.updateState(view.state.apply(tr));
        }
      });
      return view;
}


describe('Input rules plugin - unordered list rule', () => {
    it('Creates a new unordered list when a user types "- " at the beginning of a line', () => {
      const view = createEditorViewWithInputRules(schemaHelpers.paragraph('-banana'));
      view.someProp("handleTextInput", f => f(view, 2, 2, ' '));

      const doc = view.state.doc;
      expect(doc.firstChild.type.name).toBe('unordered_list');
      expect(doc.textContent).toBe('banana');
    });

    it('Ignores situations where the rule gets triggered from later in the text block', () => {
        const view = createEditorViewWithInputRules(schemaHelpers.paragraph('- banana carlisle '));
        view.someProp("handleTextInput", f => f(view, 19, 19, 'x'));

        const doc = view.state.doc;
        expect(doc.firstChild.type.name).toBe('paragraph');
        expect(doc.textContent).toBe('- banana carlisle ');
    })
});