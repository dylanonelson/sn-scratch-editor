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


describe('Input rules plugin - list wrapping rules', () => {
    it('Creates a new unordered list when a user types "- " at the beginning of a line', () => {
      const view = createEditorViewWithInputRules(schemaHelpers.paragraph('-banana'));
      view.someProp("handleTextInput", f => f(view, 2, 2, ' '));

      const doc = view.state.doc;
      expect(doc.firstChild.type.name).toBe('unordered_list');
      expect(doc.textContent).toBe('banana');
    });

    it('Creates a new ordered list when a user types "1. " at the beginning of a line', () => {
      const view = createEditorViewWithInputRules(schemaHelpers.paragraph('1.banana'));
      view.someProp("handleTextInput", f => f(view, 3, 3, ' '));

      const doc = view.state.doc;
      expect(doc.firstChild.type.name).toBe('ordered_list');
      expect(doc.textContent).toBe('banana');
    });

    it('Ignores situations where the ordered list rule gets triggered from later in the text block', () => {
        const view = createEditorViewWithInputRules(schemaHelpers.paragraph('1. banana carlisle '));
        view.someProp("handleTextInput", f => f(view, 19, 19, 'x'));

        const doc = view.state.doc;
        expect(doc.firstChild.type.name).toBe('paragraph');
        expect(doc.textContent).toBe('1. banana carlisle ');
    });

    it('Ignores situations where the rule gets triggered from later in the text block', () => {
        const view = createEditorViewWithInputRules(schemaHelpers.paragraph('- banana carlisle '));
        view.someProp("handleTextInput", f => f(view, 19, 19, 'x'));

        const doc = view.state.doc;
        expect(doc.firstChild.type.name).toBe('paragraph');
        expect(doc.textContent).toBe('- banana carlisle ');
    })
});

describe('Input rules plugin - mark wrapping rules', () => {
    it('Wraps text in code marks when surrounded by backticks', () => {
        const view = createEditorViewWithInputRules(schemaHelpers.paragraph('`code'));
        view.someProp("handleTextInput", f => f(view, 6, 6, '`'));

        const doc = view.state.doc;
        expect(doc.firstChild.type.name).toBe('paragraph');
        expect(doc.textContent).toBe('code');
        const textNode = doc.firstChild.firstChild;
        expect(textNode.marks).toHaveLength(1);
        expect(textNode.marks[0].type.name).toBe('code');
    });

    
    it('Preserves existing marks when adding new ones', () => {
        const view = createEditorViewWithInputRules(
            schemaHelpers.paragraph(
                schemaHelpers.strong('`bold')
            )
        );
        const getTextNode = () => view.state.doc.firstChild.firstChild;
        expect(getTextNode().marks).toHaveLength(1);
        expect(getTextNode().marks[0].type.name).toBe('strong');

        view.someProp("handleTextInput", f => f(view, 4, 4, '`'));

        const doc = view.state.doc;
        expect(doc.firstChild.type.name).toBe('paragraph');
        expect(doc.textContent).toBe('bold');
        expect(getTextNode().marks).toHaveLength(2);
        expect(getTextNode().marks[0].type.name).toBe('strong');
        expect(getTextNode().marks[1].type.name).toBe('code');
    });

    it('Does not wrap empty text in marks', () => {
        const view = createEditorViewWithInputRules(schemaHelpers.paragraph('``'));
        view.someProp("handleTextInput", f => f(view, 2, 2, '`'));

        const doc = view.state.doc;
        expect(doc.firstChild.type.name).toBe('paragraph');
        expect(doc.textContent).toBe('``');
        expect(doc.firstChild.marks).toHaveLength(0);
    });
});