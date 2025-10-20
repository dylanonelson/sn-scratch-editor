import { bulletList, listItem, orderedList } from 'prosemirror-schema-list';
import { marks, nodes } from 'prosemirror-schema-basic';
import { NodeSpec, Schema, SchemaSpec } from 'prosemirror-model';

export const MARKDOWN_ESCAPED_ATTR = 'markdown_escaped';
export const AUTO_LINK_ATTR = 'auto_link'; // Links auto-detected from user input, as opposed to links added as metadata by the user

const EDITOR_CLS = 'sn-editor';

const docSpec: NodeSpec = {
  content: 'block+',
  toDOM(node) {
    return ['main', { class: EDITOR_CLS }, 0];
  },
  parseDOM: [
    {
      tag: 'main',
    },
  ],
};

const heading1Spec: NodeSpec = {
  content: 'inline*',
  defining: true,
  group: 'block',
  toDOM(node) {
    return ['h1', { class: EDITOR_CLS }, 0];
  },
  parseDOM: [
    {
      tag: 'h1',
    },
  ],
};

const heading2Spec: NodeSpec = {
  content: 'inline*',
  defining: true,
  group: 'block',
  toDOM(node) {
    return ['h2', { class: EDITOR_CLS }, 0];
  },
  parseDOM: [{ tag: 'h2' }],
};

const heading3Spec: NodeSpec = {
  content: 'inline*',
  defining: true,
  group: 'block',
  toDOM(node) {
    return ['h3', { class: EDITOR_CLS }, 0];
  },
  parseDOM: [{ tag: 'h3' }],
};

const paragraphSpec: NodeSpec = {
  content: 'inline*',
  group: 'block',
  marks: '_',
  toDOM(node) {
    return ['p', { class: EDITOR_CLS }, 0];
  },
  parseDOM: [{ tag: 'p' }],
};

export enum CheckboxStatus {
  DONE,
  EMPTY,
}

const checklistItemSpec: NodeSpec = {
  attrs: {
    status: {
      default: CheckboxStatus.EMPTY,
    },
  },
  content: 'inline*',
  defining: true,
  group: 'block',
  marks: '_',
  toDOM(node) {
    return [
      'div',
      { class: 'checklist-item' },
      [
        'input',
        {
          type: 'checkbox',
          ...(node.attrs.status === CheckboxStatus.DONE && { checked: 'true' }),
        },
      ],
      ['p', 0],
    ];
  },
  parseDOM: [
    {
      contentElement: 'p',
      tag: 'div.checklist-item',
      getAttrs(node) {
        // Will be type Node when parseDOM supplies a 'tag' rule
        const input = (node as HTMLElement).querySelector('input');
        return {
          status: !!(input as HTMLInputElement).checked
            ? CheckboxStatus.DONE
            : CheckboxStatus.EMPTY,
        };
      },
    },
  ],
};

const textSpec: NodeSpec = {
  group: 'inline',
};

const codeBlockSpec: NodeSpec = {
  ...nodes.code_block,
  attrs: {
    ...nodes.code_block.attrs,
    [MARKDOWN_ESCAPED_ATTR]: {
      default: false,
    },
  },
  toDOM(node) {
    const attrs = {
      [`data-${MARKDOWN_ESCAPED_ATTR}`]: node.attrs[MARKDOWN_ESCAPED_ATTR],
    };
    return node.attrs[MARKDOWN_ESCAPED_ATTR]
      ? ['pre', attrs, ['div', { class: 'info' }, 'i'], ['code', 0]]
      : ['pre', attrs, ['code', 0]];
  },
};

const spec: SchemaSpec = {
  nodes: {
    doc: docSpec,
    // Order matters here. pm apparently inserts the first valid node on enter.
    paragraph: paragraphSpec,
    checklist_item: checklistItemSpec,
    unordered_list: {
      ...bulletList,
      content: 'list_item+',
      group: 'block',
      selectable: false,
    },
    ordered_list: {
      ...orderedList,
      content: 'list_item+',
      group: 'block',
      selectable: false,
    },
    list_item: {
      ...listItem,
      content: 'paragraph (paragraph | ordered_list | unordered_list)*',
      selectable: false,
    },
    heading1: heading1Spec,
    heading2: heading2Spec,
    heading3: heading3Spec,
    text: textSpec,
    code_block: codeBlockSpec,
  },
  marks: {
    link: {
      attrs: {
        href: { default: '' },
        title: { default: null },
        [AUTO_LINK_ATTR]: { default: false },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom: HTMLElement) {
            return {
              href: dom.getAttribute('href'),
              title: dom.getAttribute('title'),
              [`data-${AUTO_LINK_ATTR}`]: dom.getAttribute(
                `data-${AUTO_LINK_ATTR}`,
              ),
            };
          },
        },
      ],
      toDOM(node) {
        let { href, title } = node.attrs;
        return [
          'a',
          {
            href,
            title,
            [`data-${AUTO_LINK_ATTR}`]: node.attrs[AUTO_LINK_ATTR],
          },
          0,
        ];
      },
    },
    em: {
      ...marks.em,
    },
    strong: {
      ...marks.strong,
    },
    code: {
      ...marks.code,
      attrs: {
        ...marks.code.attrs,
        [MARKDOWN_ESCAPED_ATTR]: {
          default: false,
        },
      },
    },
  },
};

export const schema = new Schema(spec);
