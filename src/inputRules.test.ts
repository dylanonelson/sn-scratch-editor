import { Node } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { builders } from 'prosemirror-test-builder';
import { EditorView } from 'prosemirror-view';
import { inputRulesForcedSpacePlugin, inputRulesPlugin } from './inputRules';
import { schema } from './schema';

const schemaHelpers = builders(schema, {});

const createEditorViewWithInputRulesAndSelection = (
  selectionPos: number,
  ...content: Node[]
) => {
  const doc = schemaHelpers.doc(...content);
  const textSelection = TextSelection.create(doc, selectionPos);
  const editorState = EditorState.create({
    doc,
    schema,
    plugins: [inputRulesPlugin, inputRulesForcedSpacePlugin],
    selection: textSelection,
  });
  const view = new EditorView(document.createElement('div'), {
    state: editorState,
    dispatchTransaction: (tr) => {
      view.updateState(view.state.apply(tr));
    },
  });
  return view;
};

describe('Input rules plugin - list wrapping rules', () => {
  it('Creates a new unordered list when a user types "- " at the beginning of a line', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      2,
      schemaHelpers.paragraph('-banana'),
    );
    view.someProp('handleTextInput', (f) => f(view, 2, 2, ' '));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('unordered_list');
    expect(doc.textContent).toBe('banana');
  });

  it('Creates a new ordered list when a user types "1. " at the beginning of a line', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      3,
      schemaHelpers.paragraph('1.banana'),
    );
    view.someProp('handleTextInput', (f) => f(view, 3, 3, ' '));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('ordered_list');
    expect(doc.textContent).toBe('banana');
  });

  it('Ignores situations where the ordered list rule gets triggered from later in the text block', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      19,
      schemaHelpers.paragraph('1. banana carlisle '),
    );
    view.someProp('handleTextInput', (f) => f(view, 19, 19, 'x'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('1. banana carlisle ');
  });

  it('Ignores situations where the rule gets triggered from later in the text block', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      19,
      schemaHelpers.paragraph('- banana carlisle '),
    );
    view.someProp('handleTextInput', (f) => f(view, 19, 19, 'x'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('- banana carlisle ');
  });
});

describe('Input rules plugin - mark wrapping rules', () => {
  it('Wraps text in code marks when surrounded by backticks', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      6,
      schemaHelpers.paragraph('`code'),
    );
    view.someProp('handleTextInput', (f) => f(view, 6, 6, '`'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('code ');
    const textNode = doc.firstChild.firstChild;
    expect(textNode.marks).toHaveLength(1);
    expect(textNode.marks[0].type.name).toBe('code');
  });

  it('Preserves existing marks when adding new ones', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      6,
      schemaHelpers.paragraph(schemaHelpers.strong('`bold')),
    );
    const getTextNode = () => view.state.doc.firstChild.firstChild;
    expect(getTextNode().marks).toHaveLength(1);
    expect(getTextNode().marks[0].type.name).toBe('strong');

    view.someProp('handleTextInput', (f) => f(view, 6, 6, '`'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('bold ');
    expect(getTextNode().marks).toHaveLength(2);
    expect(getTextNode().marks[0].type.name).toBe('strong');
    expect(getTextNode().marks[1].type.name).toBe('code');
  });

  it('Does not wrap empty text in marks', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      2,
      schemaHelpers.paragraph('``'),
    );
    view.someProp('handleTextInput', (f) => f(view, 2, 2, '`'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('``');
    expect(doc.firstChild.marks).toHaveLength(0);
  });

  it('Does not apply input rules inside code marks', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      6,
      schemaHelpers.paragraph(schemaHelpers.code('_code')),
    );
    view.someProp('handleTextInput', (f) => f(view, 6, 6, '_'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('_code');
    const getTextNode = () => view.state.doc.firstChild.firstChild;
    expect(getTextNode().marks).toHaveLength(1);
    expect(getTextNode().marks[0].type.name).toBe('code');
  });
});

describe('Forced space plugin', () => {
  it('Swallows an entered space when an input rule has just inserted one', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      6,
      schemaHelpers.paragraph('*bold'),
    );
    view.someProp('handleTextInput', (f) => f(view, 6, 6, '*'));
    expect(view.state.doc.textContent).toBe('bold ');
    expect(view.someProp('handleTextInput', (f) => f(view, 6, 6, ' '))).toBe(
      true,
    );
    // The second time, it's fine to insert a space
    expect(
      view.someProp('handleTextInput', (f) => f(view, 6, 6, ' ')),
    ).toBeUndefined();
  });

  it('Does not swallow a space when the user types a different character', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      6,
      schemaHelpers.paragraph('*bold'),
    );
    view.someProp('handleTextInput', (f) => f(view, 6, 6, '*'));
    expect(view.state.doc.textContent).toBe('bold ');
    expect(
      view.someProp('handleTextInput', (f) => f(view, 6, 6, 'x')),
    ).toBeUndefined();
  });

  it('Does not swallow a space when the user changes the selection', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      6,
      schemaHelpers.paragraph('*bold'),
    );
    view.someProp('handleTextInput', (f) => f(view, 6, 6, '*'));
    expect(view.state.doc.textContent).toBe('bold ');
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)),
    );
    expect(
      view.someProp('handleTextInput', (f) => f(view, 6, 6, ' ')),
    ).toBeUndefined();
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 6)),
    );
    expect(
      view.someProp('handleTextInput', (f) => f(view, 6, 6, ' ')),
    ).toBeUndefined();
  });
});

describe('Input rules plugin - arrow character rules', () => {
  it('Converts -> to a right arrow (→) character', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      2,
      schemaHelpers.paragraph('-'),
    );
    view.someProp('handleTextInput', (f) => f(view, 2, 2, '>'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('→');
  });

  it('Converts <-> to a bidirectional arrow (↔) character', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      3,
      schemaHelpers.paragraph('<-'),
    );
    view.someProp('handleTextInput', (f) => f(view, 3, 3, '>'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('↔');
  });

  it('Does not convert arrow syntax inside code marks', () => {
    const view = createEditorViewWithInputRulesAndSelection(
      2,
      schemaHelpers.paragraph(schemaHelpers.code('-')),
    );
    view.someProp('handleTextInput', (f) => f(view, 2, 2, '>'));

    const doc = view.state.doc;
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.textContent).toBe('-');
    const textNode = doc.firstChild.firstChild;
    expect(textNode.marks).toHaveLength(1);
    expect(textNode.marks[0].type.name).toBe('code');
  });
});
