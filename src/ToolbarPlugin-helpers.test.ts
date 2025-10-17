import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  outdentListSelection,
  swapTextBlock,
  toggleList,
} from './ToolbarPlugin';
import { schema } from './schema';
import { builders } from 'prosemirror-test-builder';

const { doc, p, ul, ol, li, h1, h2, h3 } = builders(schema, {
  p: { nodeType: 'paragraph' },
  h1: { nodeType: 'heading1' },
  ul: { nodeType: 'unordered_list' },
  ol: { nodeType: 'ordered_list' },
  li: { nodeType: 'list_item' },
  h2: { nodeType: 'heading2' },
  h3: { nodeType: 'heading3' },
});

class MockView {
  state: EditorState;

  constructor(state: EditorState, mockDispatch?: jest.Mock) {
    this.state = state;
    if (mockDispatch) {
      this.dispatch = mockDispatch;
    }
  }

  dispatch = (tr: Transaction) => {
    const next = this.state.apply(tr);
    this.updateState(next);
  };

  updateState = (state: EditorState) => {
    this.state = state;
  };
}

// Helper to create a mock EditorView with the given document and selection
function createMockView(
  document: any,
  from: number,
  to: number,
  mockDispatch?: jest.Mock,
): EditorView {
  const state = EditorState.create({
    doc: document,
    selection: TextSelection.create(document, from, to),
  });

  return new MockView(state, mockDispatch) as unknown as EditorView;
}

describe('toggleList', () => {
  describe('when selection is in a non-list', () => {
    it('should convert a paragraph to an unordered list', () => {
      const document = doc(p('Hello world'));
      const view = createMockView(document, 1, 1);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.unordered_list);
      expect(view.state.doc.nodeSize).toBe(19);
      expect(view.state.doc.child(0).textContent).toBe('Hello world');
    });

    it('should convert a paragraph to an ordered list', () => {
      const document = doc(p('Hello world'));
      const view = createMockView(document, 1, 1);

      toggleList(view, schema.nodes.ordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.ordered_list);
      expect(view.state.doc.nodeSize).toBe(19);
      expect(view.state.doc.child(0).textContent).toBe('Hello world');
    });

    it('should convert heading to unordered list', () => {
      const document = doc(h1('Heading'));
      const view = createMockView(document, 1, 1);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.unordered_list);
      expect(view.state.doc.nodeSize).toBe(15);
      expect(view.state.doc.child(0).textContent).toBe('Heading');
    });

    it('should convert multiple paragraphs to a list', () => {
      const document = doc(p('First'), p('Second'));
      const view = createMockView(document, 2, 11);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.unordered_list);
      expect(view.state.doc.child(0).childCount).toBe(2);
      expect(view.state.doc.textContent).toBe('FirstSecond');
    });
  });

  describe('when selection is a list of the same type', () => {
    it('should convert unordered list to paragraph', () => {
      const document = doc(ul(li(p('Item one'))));
      const view = createMockView(document, 3, 3);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.paragraph);
      expect(view.state.doc.textContent).toBe('Item one');
    });

    it('should convert ordered list to paragraph', () => {
      const document = doc(ol(li(p('Item one'))));
      const view = createMockView(document, 3, 3);

      toggleList(view, schema.nodes.ordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.paragraph);
      expect(view.state.doc.textContent).toBe('Item one');
    });

    it('should convert multi-item list to paragraphs', () => {
      const document = doc(ul(li(p('First')), li(p('Second'))));
      const view = createMockView(document, 3, 15);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type.name).toBe(
        schema.nodes.paragraph.name,
      );
      expect(view.state.doc.child(1).type.name).toBe(
        schema.nodes.paragraph.name,
      );
      expect(view.state.doc.childCount).toBe(2);
      expect(view.state.doc.textContent).toBe('FirstSecond');
    });

    it('should convert only the selected item to a paragarph, leaving two lists', () => {
      const document = doc(
        ul(li(p('First')), li(p('Sec<s>ond')), li(p('Third'))),
      );
      const view = createMockView(document, document.tag.s, document.tag.s);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.unordered_list);
      expect(view.state.doc.child(1).type).toBe(schema.nodes.paragraph);
      expect(view.state.doc.child(1).textContent).toBe('Second');
      expect(view.state.doc.child(2).type).toBe(schema.nodes.unordered_list);
      expect(view.state.doc.textContent).toBe('FirstSecondThird');
    });
  });

  describe('when selection is a list of a different type', () => {
    it('should convert unordered list to ordered list', () => {
      const document = doc(ul(li(p('Item one'))));
      const view = createMockView(document, 3, 3);

      toggleList(view, schema.nodes.ordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.ordered_list);
      expect(view.state.doc.child(0).childCount).toBe(1);
      expect(view.state.doc.textContent).toBe('Item one');
    });

    it('should convert ordered list to unordered list', () => {
      const document = doc(ol(li(p('Item one'))));
      const view = createMockView(document, 3, 3);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.unordered_list);
      expect(view.state.doc.child(0).childCount).toBe(1);
      expect(view.state.doc.textContent).toBe('Item one');
    });

    it('should convert multi-item ordered list to unordered list', () => {
      const document = doc(ol(li(p('First')), li(p('Second'))));
      const view = createMockView(document, 3, 15);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(view.state.doc.child(0).type).toBe(schema.nodes.unordered_list);
      expect(view.state.doc.textContent).toBe('FirstSecond');
    });
  });

  describe('when selection overlaps list and non-list nodes', () => {
    it('should do nothing when selection includes paragraph and list', () => {
      const document = doc(p('Paragraph'), ul(li(p('List item'))));
      const mockDispatch = jest.fn();
      const view = createMockView(document, 1, 20, mockDispatch);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should do nothing when selection includes list and paragraph', () => {
      const document = doc(ul(li(p('List item'))), p('Paragraph'));
      const mockDispatch = jest.fn();
      const view = createMockView(document, 3, 25, mockDispatch);

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should do nothing when the selection spans multiple node types', () => {
      const document = doc(
        ul(li(p('<s>List item'))),
        p('Paragraph'),
        h2('heading'),
        ul(li(p('List item<e>'))),
      );
      const mockDispatch = jest.fn();
      const view = createMockView(
        document,
        document.tag.s,
        document.tag.e,
        mockDispatch,
      );
      const originalDoc = view.state.doc;

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('when selection includes nested list', () => {
    it('should do nothing when selection is in a nested unordered list', () => {
      const document = doc(ul(li(p('Parent'), ul(li(p('Nes<s>t<e>ed'))))));
      const mockDispatch = jest.fn();
      const view = createMockView(
        document,
        document.tag.s,
        document.tag.e,
        mockDispatch,
      );

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should do nothing when selection is in a nested ordered list', () => {
      const document = doc(ul(li(p('Par<s>ent'), ol(li(p('Nest<e>ed'))))));
      const mockDispatch = jest.fn();
      const view = createMockView(
        document,
        document.tag.s,
        document.tag.e,
        mockDispatch,
      );

      toggleList(view, schema.nodes.ordered_list, schema.nodes.list_item);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should do nothing when list item contains nested list in selection', () => {
      const document = doc(
        ul(li(p('Item<s> one'), ul(li(p('Nested')))), li(p('Item<e> two'))),
      );
      const mockDispatch = jest.fn();
      const view = createMockView(
        document,
        document.tag.s,
        document.tag.e,
        mockDispatch,
      );

      toggleList(view, schema.nodes.unordered_list, schema.nodes.list_item);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});

describe('swapTextBlock', () => {
  it('should do nothing when selection is within a nested list', () => {
    const document = doc(ul(li(p('Parent'), ul(li(p('Nest<s>ed'))))));
    const mockDispatch = jest.fn();
    const view = createMockView(
      document,
      document.tag.s,
      document.tag.s,
      mockDispatch,
    );

    swapTextBlock(view, schema.nodes.paragraph);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should do nothing when the selection begins within a nested list', () => {
    const document = doc(
      ul(li(p('Item one'), ul(li(p('Nested <s>one')))), li(p('Item<e> two'))),
    );
    const mockDispatch = jest.fn();
    const view = createMockView(
      document,
      document.tag.s,
      document.tag.e,
      mockDispatch,
    );

    swapTextBlock(view, schema.nodes.paragraph);

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

describe('outdentListSelection', () => {
  it('should outdent the list item  when the selection begins at the top level of the outdentable selection', () => {
    const document = doc(
      ul(li(p('Item <s>one'), ul(li(p('Nested one')), li(p('Nested<e> two'))))),
    );
    const view = createMockView(document, document.tag.s, document.tag.e);
    outdentListSelection(view.state, view.dispatch);
    expect(view.state.doc.child(0).type.name).toBe(schema.nodes.paragraph.name);
    expect(view.state.doc.child(0).textContent).toBe('Item one');
    expect(view.state.doc.child(1).type.name).toBe(
      schema.nodes.unordered_list.name,
    );
    expect(view.state.doc.child(1).textContent).toBe('Nested oneNested two');
  });

  it('should outdent the list item  when the selection is within the top level of the outdentable selection', () => {
    const document = doc(
      ul(li(p('Item <s>one'), ul(li(p('Nested one')), li(p('Nested two'))))),
    );
    const view = createMockView(document, document.tag.s, document.tag.s);
    outdentListSelection(view.state, view.dispatch);
    expect(view.state.doc.child(0).type.name).toBe(schema.nodes.paragraph.name);
    expect(view.state.doc.child(0).textContent).toBe('Item one');
    expect(view.state.doc.child(1).type.name).toBe(
      schema.nodes.unordered_list.name,
    );
    expect(view.state.doc.child(1).textContent).toBe('Nested oneNested two');
  });

  it('should outdent the list item when the selection is in a sublist and can be outdented cleanly', () => {
    const document = doc(
      ul(li(p('Item one'), ul(li(p('Nested <s>one')), li(p('Nested two'))))),
    );
    const view = createMockView(document, document.tag.s, document.tag.s);
    outdentListSelection(view.state, view.dispatch);
    expect(view.state.doc.child(0).type.name).toBe(
      schema.nodes.unordered_list.name,
    );
    const unorderedListNode = view.state.doc.child(0);
    expect(unorderedListNode.childCount).toBe(2);
    const secondListItemNode = unorderedListNode.child(1);
    expect(secondListItemNode.type.name).toBe('list_item');
    expect(secondListItemNode.childCount).toBe(2);
    expect(secondListItemNode.textContent).toBe('Nested oneNested two');
  });

  it('should do nothing when the selection spans a nested list and the outdent would pull the preceding list items outward', () => {
    const document = doc(
      ul(
        li(p('Item one'), ul(li(p('Nested <s>one')), li(p('Nested two')))),
        li(p('Item<e> two')),
      ),
    );
    const mockDispatch = jest.fn();
    const view = createMockView(
      document,
      document.tag.s,
      document.tag.e,
      mockDispatch,
    );
    outdentListSelection(view.state, view.dispatch);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should do nothing when the selection spans many list items but ultimately winds up pulling in a large parent list', () => {
    // prettier-ignore
    const document = doc(
      ul(
        li(
          p('Item 1'),
          ul(
            li(p('Nested 1-1')),
            li(p('Nest<s2>ed 1-2')),
            ul(
              li(p('Nested 2-1')),
              li(
                p('Nested 3-1'),
                ul(
                  li(p('Nested 4-1')),
                  li(p('Nes<s1>ted 4-2')),
                ),
              ),
            ),
            li(
              p('Nested 2-2'),
              ul(
                li(p('Nested 3-2')),
                li(p('Nes<s3>ted 3-3'))
              )
            ),
          ),
        ),
        li(p('I<e2>tem<e1> 1-2')),
        li(
          p('Item 1-3'),
          ul(
            li(p('Nested 1-3')),
            li(p('Neste<e3>d 1-4')),
          ),
        ),
      ),
    );
    const mockDispatch = jest.fn();
    let view = createMockView(
      document,
      document.tag.s1,
      document.tag.e1,
      mockDispatch,
    );
    outdentListSelection(view.state, view.dispatch);
    expect(mockDispatch).not.toHaveBeenCalled();

    view = createMockView(
      document,
      document.tag.s2,
      document.tag.e2,
      mockDispatch,
    );
    outdentListSelection(view.state, view.dispatch);
    expect(mockDispatch).not.toHaveBeenCalled();

    view = createMockView(
      document,
      document.tag.s3,
      document.tag.e3,
      mockDispatch,
    );
    outdentListSelection(view.state, view.dispatch);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
