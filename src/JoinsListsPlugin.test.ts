import { wrapInList } from 'prosemirror-schema-list';
import { EditorState, TextSelection } from 'prosemirror-state';
import { builders } from 'prosemirror-test-builder';
import { inputRulesPlugin } from './inputRules';
import { JoinListsPlugin } from './JoinListsPlugin';
import { schema } from './schema';

const schemaHelpers = builders(schema, {});

describe('Join lists plugin', () => {
  it('joins lists when they are adjacent', () => {
    const doc = schemaHelpers.doc(
      schemaHelpers.unordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('1-1<s>')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-2')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-3<t>')),
      ),
      schemaHelpers.unordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('<j>2-1')),
        schemaHelpers.list_item(schemaHelpers.paragraph('2-2')),
        schemaHelpers.list_item(schemaHelpers.paragraph('2-3')),
      ),
    );

    const editorState = EditorState.create({
      doc,
      schema,
      plugins: [new JoinListsPlugin()],
    });

    // Fire off a test transaction to trigger the plugin
    const tr = editorState.tr.insert(doc.tag.s, schema.text('!'));
    const newState = editorState.apply(tr);

    expect(newState.doc.childCount).toBe(1);
    const listNode = newState.doc.child(0);
    expect(listNode.type.name).toBe(schema.nodes.unordered_list.name);
    expect(listNode.childCount).toBe(6);
    expect(listNode.textContent).toBe('1-1!1-21-32-12-22-3');
  });

  it('does not join adjacent lists of different types', () => {
    const doc = schemaHelpers.doc(
      schemaHelpers.unordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('1-1<s>')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-2')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-3')),
      ),
      schemaHelpers.ordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('1-1')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-2')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-3')),
      ),
    );

    const editorState = EditorState.create({
      doc,
      schema,
      plugins: [new JoinListsPlugin()],
    });

    const tr = editorState.tr.insert(doc.tag.s, schema.text('!'));
    const newState = editorState.apply(tr);

    expect(newState.doc.childCount).toBe(2);
  });

  it('appends the transaction when the user creates an adjacent list', () => {
    const doc = schemaHelpers.doc(
      schemaHelpers.unordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('1-1')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-2')),
        schemaHelpers.list_item(schemaHelpers.paragraph('1-3')),
      ),
      schemaHelpers.paragraph('<s>'),
    );

    const editorState = EditorState.create({
      doc,
      schema,
      plugins: [new JoinListsPlugin(), inputRulesPlugin],
      selection: TextSelection.create(doc, doc.tag.s),
    });

    let newState: EditorState;
    wrapInList(schema.nodes.unordered_list)(editorState, (tr) => {
      newState = editorState.apply(tr);
    });

    expect(newState.doc.childCount).toBe(1);
    const listNode = newState.doc.child(0);
    expect(listNode.type.name).toBe(schema.nodes.unordered_list.name);
    expect(listNode.childCount).toBe(4);
  });

  it('theoretically works in multiple positions', () => {
    const doc = schemaHelpers.doc(
      schemaHelpers.paragraph('at the top<s1>'),
      schemaHelpers.unordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('1-1')),
      ),
      schemaHelpers.unordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('2-1')),
      ),
      schemaHelpers.paragraph('and<s2>'),
      schemaHelpers.ordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('3-1')),
      ),
      schemaHelpers.ordered_list(
        schemaHelpers.list_item(schemaHelpers.paragraph('4-1')),
      ),
    );

    const editorState = EditorState.create({
      doc,
      schema,
      plugins: [new JoinListsPlugin()],
    });

    const tr = editorState.tr.delete(doc.tag.s2 - 1, doc.tag.s2);
    tr.delete(doc.tag.s1 - 1, doc.tag.s1);
    const newState = editorState.apply(tr);

    expect(newState.doc.childCount).toBe(4);

    const listNode_1 = newState.doc.child(1);
    expect(listNode_1.type.name).toBe(schema.nodes.unordered_list.name);
    expect(listNode_1.childCount).toBe(2);
    expect(listNode_1.textContent).toBe('1-12-1');

    const listNode_2 = newState.doc.child(3);
    expect(listNode_2.type.name).toBe(schema.nodes.ordered_list.name);
    expect(listNode_2.childCount).toBe(2);
    expect(listNode_2.textContent).toBe('3-14-1');
  });
});
