import { bulletList, listItem, orderedList } from 'prosemirror-schema-list';
import { marks, nodes } from 'prosemirror-schema-basic';
import OrderedMap from 'orderedmap';
import {
  DOMOutputSpecArray,
  Node,
  NodeSpec,
  NodeType,
  Schema,
} from 'prosemirror-model';

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
    markdown_escaped: {
      default: false,
    },
  },
  toDOM(node) {
    const spec = [
      'pre',
      { 'data-markdown_escaped': node.attrs.markdown_escaped },
      ['code', 0],
    ] as DOMOutputSpecArray;
    if (node.attrs.markdown_escaped) {
      // DOMOutputSpec types are messed up :(
      // @ts-ignore
      spec.push(['div', {class: 'info'}, 'i'])
    }
    return spec;
  },
};

const spec = {
  nodes: {
    doc: docSpec,
    // Order matters here. pm apparently inserts the first valid node on enter.
    paragraph: paragraphSpec,
    checklist_item: checklistItemSpec,
    unordered_list: {
      ...bulletList,
      content: 'list_item+',
      group: 'block',
      attrs: {
        ...bulletList.attrs,
        tight: {
          default: true,
        },
      }
    },
    ordered_list: {
      ...orderedList,
      content: 'list_item+',
      group: 'block',
      attrs: {
        ...orderedList.attrs,
        tight: {
          default: true,
        }
      },
    },
    list_item: {
      ...listItem,
      content: 'paragraph+',
    },
    heading1: heading1Spec,
    heading2: heading2Spec,
    text: textSpec,
    code_block: codeBlockSpec,
  },
  marks: {
    link: {
      ...marks.link,
    },
    em: {
      ...marks.em,
      inclusive: false,
    },
    strong: {
      ...marks.strong,
      inclusive: false,
    },
    code: {
      ...marks.code,
      inclusive: false,
    },
  },
};

export const schema = new Schema(spec);
