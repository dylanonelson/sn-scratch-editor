import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema } from './schema';
import { builders } from 'prosemirror-test-builder';
import { ToolbarPlugin } from './ToolbarPlugin';
import { CheckboxStatus } from './schema';

const schemaHelpers = builders(schema, {});

beforeAll(() => {
  // Mock these methods in the JSDom environment; they are called internally by ProseMirror
  Range.prototype.getBoundingClientRect = () => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  Range.prototype.getClientRects = () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: jest.fn(),
  });
});

describe('ToolbarPlugin', () => {
  let toolbarEl: HTMLElement;
  let modalEl: HTMLElement;
  let editorContainer: HTMLElement;
  let view: EditorView;
  let plugin: ToolbarPlugin;

  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = '';
    toolbarEl = document.createElement('div');
    toolbarEl.className = 'toolbar';
    modalEl = document.createElement('div');
    modalEl.id = 'link-modal';
    modalEl.innerHTML = `
      <div id="frame">
        <input id="text" type="text" />
        <input id="url" type="text" />
        <button id="confirm">Confirm</button>
        <button id="cancel">Cancel</button>
        <button id="clear">Clear</button>
      </div>
    `;
    editorContainer = document.createElement('div');

    document.body.appendChild(toolbarEl);
    document.body.appendChild(modalEl);
    document.body.appendChild(editorContainer);

    // Create the plugin
    plugin = new ToolbarPlugin(toolbarEl, modalEl);

    // Create editor state with the plugin
    const state = EditorState.create({
      doc: schemaHelpers.doc(schemaHelpers.paragraph('Hello world')),
      schema,
      plugins: [plugin],
    });

    // Create editor view with mocked DOM methods for testing
    view = new EditorView(editorContainer, {
      state,
      dispatchTransaction: (tr) => {
        view.updateState(view.state.apply(tr));
      },
    });
  });

  afterEach(() => {
    view.destroy();
  });

  describe('toolbar button interactions', () => {
    test('applies bold format when button is clicked', () => {
      // Create a button with the proper data attribute
      const boldButton = document.createElement('button');
      boldButton.setAttribute('data-format', 'strong');
      toolbarEl.appendChild(boldButton);

      // Select text
      const { state } = view;
      const tr = state.tr.setSelection(
        TextSelection.create(state.doc, 1, 12), // Select "Hello world"
      );
      view.dispatch(tr);

      // Call handler directly instead of simulating click
      const handleClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      // Trigger the event
      boldButton.dispatchEvent(handleClick);

      // Check if the text now has the strong mark
      const textNode = view.state.doc.textContent;
      const marks = view.state.doc.firstChild.firstChild.marks;

      expect(textNode).toBe('Hello world');
      expect(marks.length).toBe(1);
      expect(marks[0].type.name).toBe('strong');
    });

    test('applies heading format', () => {
      // Call the plugin's applyFormat method directly
      plugin.applyFormat('heading');

      // Check if the paragraph was converted to a heading
      expect(view.state.doc.firstChild.type.name).toBe('heading3');
    });

    test('toggles unordered list', () => {
      // Call the plugin's applyFormat method directly
      plugin.applyFormat('unordered_list');

      // Check if the paragraph was converted to an unordered list
      expect(view.state.doc.firstChild.type.name).toBe('unordered_list');
      expect(view.state.doc.firstChild.firstChild.type.name).toBe('list_item');
      expect(view.state.doc.textContent).toBe('Hello world');

      // Toggle off
      plugin.applyFormat('unordered_list');

      // Should be converted back to paragraph
      expect(view.state.doc.firstChild.type.name).toBe('paragraph');
    });

    test('toggles checklist item', () => {
      // Call the plugin's applyFormat method directly
      plugin.applyFormat('checklist_item');

      // Check if the paragraph was converted to a checklist item
      expect(view.state.doc.firstChild.type.name).toBe('checklist_item');
      expect(view.state.doc.textContent).toBe('Hello world');
      expect(view.state.doc.firstChild.attrs.status).toBe(CheckboxStatus.EMPTY);

      // Toggle off
      plugin.applyFormat('checklist_item');

      // Should be converted back to paragraph
      expect(view.state.doc.firstChild.type.name).toBe('paragraph');
    });
  });

  describe('format highlighting', () => {
    test('formats are correctly identified', () => {
      // Create a new state with a heading
      const headingState = EditorState.create({
        doc: schemaHelpers.doc(schemaHelpers.heading3('Hello world')),
        schema,
        plugins: [plugin],
      });

      view.updateState(headingState);
      view.dispatch(
        headingState.tr.setSelection(TextSelection.create(headingState.doc, 2)),
      );

      // Use the internal method to get format attrs
      const formatAttrs = plugin.getSelectedFormatAttrs(view.state);

      // We expect to find the heading format
      expect(formatAttrs).toContain('heading');
    });

    test('mark formats are correctly identified', () => {
      // Create a new state with strong text
      const strongText = schemaHelpers.strong('Hello world');
      const strongState = EditorState.create({
        doc: schemaHelpers.doc(schemaHelpers.paragraph(strongText)),
        schema,
        plugins: [plugin],
      });

      view.updateState(strongState);

      // Use the internal method to get format attrs
      const formatAttrs = plugin.getSelectedFormatAttrs(view.state);

      // We expect to find the paragraph and strong formats
      expect(formatAttrs).toContain('paragraph');
      expect(formatAttrs).toContain('strong');
    });
  });

  describe('keyboard shortcuts', () => {
    test('applies bold format when the user selects text and presses cmd+b', () => {
      const { state } = view;
      const tr = state.tr.setSelection(
        TextSelection.create(state.doc, 1, 12), // Select "Hello world"
      );
      view.dispatch(tr);

      const event = new KeyboardEvent('keydown', {
        key: 'b',
        metaKey: true,
        bubbles: true,
      });

      view.someProp('handleKeyDown')(view, event);

      expect(view.state.doc.firstChild.firstChild.marks.length).toBe(1);
      expect(view.state.doc.firstChild.firstChild.marks[0].type.name).toBe(
        'strong',
      );
    });
  });

  test.only('applies heading format when the user selects text and presses cmd+=', () => {
    const { state } = view;
    const tr = state.tr.setSelection(TextSelection.create(state.doc, 1));
    view.dispatch(tr);

    const triggerHeadingPromotion = () => {
      const event = new KeyboardEvent('keydown', {
        key: '=',
        ctrlKey: true,
        bubbles: true,
      });

      return view.someProp('handleKeyDown')(view, event);
    };

    triggerHeadingPromotion();
    expect(view.state.doc.firstChild.type.name).toBe('heading3');
    triggerHeadingPromotion();
    expect(view.state.doc.firstChild.type.name).toBe('heading2');
    triggerHeadingPromotion();
    expect(view.state.doc.firstChild.type.name).toBe('heading1');
    triggerHeadingPromotion();
    expect(view.state.doc.firstChild.type.name).toBe('paragraph');
  });
});
