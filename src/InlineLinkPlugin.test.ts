import { builders } from 'prosemirror-test-builder';
import { findAndInsertInlineLinks, InlineLinkPlugin } from './InlineLinkPlugin';
import { schema } from './schema';
import { EditorState } from 'prosemirror-state';

const schemaHelpers = builders(schema, {});

describe('Inline links plugin', () => {
  it('inserts inline links when a document contains matching text', () => {
    const doc = schemaHelpers.doc(
      schemaHelpers.paragraph(
        'Check out https://standardnotes.org for more info',
      ),
    );
    const editorState = EditorState.create({
      doc,
      schema,
      plugins: [new InlineLinkPlugin()],
    });

    // Fire off a test transaction to trigger the plugin
    const tr = editorState.tr.insert(
      editorState.doc.content.size - 1,
      schema.text('!'),
    );
    const newState = editorState.apply(tr);
    expect(newState.doc.textContent).toBe(
      'Check out https://standardnotes.org for more info!',
    );

    // Grab the text node that was created by the plugin
    const linkNode = newState.doc.nodeAt(11);
    expect(linkNode.type.isText).toBe(true);
    expect(linkNode.textContent).toBe('https://standardnotes.org');
    const linkMark = linkNode.marks[0];
    expect(linkMark.type).toBe(schema.marks.inline_link);
    expect(linkMark.attrs.href).toBe('https://standardnotes.org');
  });

  // Test that the plugin will not insert an inline link if the url text overlaps with a link node added manually by the user
  it('does not insert an inline link if the url text overlaps with a link node added manually by the user', () => {
    const doc = schemaHelpers.doc(
      schemaHelpers.paragraph(
        'Check out the Standard Notes website at https://standardnotes.org for more info',
      ),
    );
    const editorState = EditorState.create({
      doc,
      schema,
      plugins: [new InlineLinkPlugin()],
    });

    // Add a manual link mark first
    const tr = editorState.tr.addMark(
      11,
      11 + 'the Standard Notes website at https://standardnotes.org'.length,
      schema.marks.link.create({ href: 'https://standardnotes.org' }),
    );
    const stateWithManualLink = editorState.apply(tr);

    // Fire off a test transaction to trigger the plugin
    const tr2 = stateWithManualLink.tr.insert(
      doc.content.size - 1,
      schema.text('!'),
    );
    const newState = stateWithManualLink.apply(tr2);

    // Verify the text content is correct
    expect(newState.doc.textContent).toBe(
      'Check out the Standard Notes website at https://standardnotes.org for more info!',
    );

    // Verify there is only one link mark and it's the manual one
    const linkNode = newState.doc.nodeAt(11);
    expect(linkNode.type.isText).toBe(true);
    expect(linkNode.textContent).toBe(
      'the Standard Notes website at https://standardnotes.org',
    );
    const linkMark = linkNode.marks[0];
    expect(linkMark.type).toBe(schema.marks.link);
    expect(linkMark.attrs.href).toBe('https://standardnotes.org');
    expect(linkNode.marks.length).toBe(1);

    expect(
      newState.doc.rangeHasMark(
        0,
        newState.doc.nodeSize -
          2 /* subtract two from doc node size to exclude start and end tokens*/,
        schema.marks.inline_link,
      ),
    ).toBe(false);
  });

  it('inserts inline links when they occur multiple times in a paragraph', () => {
    const doc = schemaHelpers.doc(
      schemaHelpers.paragraph(
        'Check out https://standardnotes.org and also visit https://standardnotes.org/features',
      ),
    );
    const editorState = EditorState.create({
      doc,
      schema,
      plugins: [new InlineLinkPlugin()],
    });

    // Fire off a test transaction to trigger the plugin
    const tr = editorState.tr.insert(doc.content.size - 1, schema.text('!'));
    const newState = editorState.apply(tr);

    // Verify the text content is correct
    expect(newState.doc.textContent).toBe(
      'Check out https://standardnotes.org and also visit https://standardnotes.org/features!',
    );

    // Verify first link mark
    const firstLinkStart = 'Check out '.length;
    const firstLinkNode = newState.doc.nodeAt(firstLinkStart);
    expect(firstLinkNode.type.isText).toBe(true);
    expect(firstLinkNode.textContent).toBe('https://standardnotes.org');
    expect(firstLinkNode.marks.length).toBe(1);
    const firstLinkMark = firstLinkNode.marks[0];
    expect(firstLinkMark.type).toBe(schema.marks.inline_link);
    expect(firstLinkMark.attrs.href).toBe('https://standardnotes.org');

    // Verify second link mark
    const secondLinkStart = 'Check out https://standardnotes.org and also visit '
      .length;
    const secondLinkNode = newState.doc.nodeAt(secondLinkStart);
    expect(secondLinkNode.type.isText).toBe(true);
    expect(secondLinkNode.textContent).toBe(
      'https://standardnotes.org/features',
    );
    expect(secondLinkNode.marks.length).toBe(1);
    const secondLinkMark = secondLinkNode.marks[0];
    expect(secondLinkMark.type).toBe(schema.marks.inline_link);
    expect(secondLinkMark.attrs.href).toBe(
      'https://standardnotes.org/features',
    );

    // Verify that there are no other marks in the document
    // Check that text before first link has no marks
    const textBeforeFirstLink = newState.doc.nodeAt('Check out'.length - 1);
    expect(textBeforeFirstLink.marks.length).toBe(0);
    expect(textBeforeFirstLink.textContent).toBe('Check out ');

    // Check text between links has no marks
    const textBetweenLinks = newState.doc.nodeAt(
      firstLinkStart +
        'https://standardnotes.org'.length +
        ' and also visit'.length -
        1,
    );
    expect(textBetweenLinks.marks.length).toBe(0);
    expect(textBetweenLinks.textContent).toBe(' and also visit ');

    // Check text after second link has no marks
    const textAfterSecondLink = newState.doc.nodeAt(
      secondLinkStart + 'https://standardnotes.org/features'.length,
    );
    expect(textAfterSecondLink.marks.length).toBe(0);
    expect(textAfterSecondLink.textContent).toBe('!');
  });
});
