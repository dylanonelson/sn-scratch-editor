import { CheckboxStatus, schema } from './schema';
import { MarkdownSerializer, defaultMarkdownSerializer } from 'prosemirror-markdown';

export const markdownSerializer = new MarkdownSerializer(
  {
    heading1(state, node) {
      state.write("# ");
      state.renderInline(node);
      state.closeBlock(node);
    },
    heading2(state, node) {
      state.write("## ");
      state.renderInline(node);
      state.closeBlock(node);
    },
    checklist_item(state, node) {
      const boxText = node.attrs.status === CheckboxStatus.DONE ? '[x]' : '[ ]';
      state.write(`- ${boxText} `);
      state.renderInline(node);
      state.closeBlock(node);
    },
    paragraph(state, node) {
      defaultMarkdownSerializer.nodes.paragraph(state, node);
    },
    list_item(state, node) {
      defaultMarkdownSerializer.nodes.list_item(state, node);
    },
    ordered_list(state, node) {
      defaultMarkdownSerializer.nodes.ordered_list(state, node);
    },
    unordered_list(state, node) {
      defaultMarkdownSerializer.nodes.bullet_list(state, node);
    },
    text(state, node) {
      defaultMarkdownSerializer.nodes.text(state, node);
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
  },
);
