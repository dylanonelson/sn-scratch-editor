import { bulletList, listItem, orderedList } from 'prosemirror-schema-list';
import { marks } from 'prosemirror-schema-basic';
import OrderedMap from 'orderedmap';

import {
  DOMOutputSpecArray,
  NodeSpec,
  Schema,
} from 'prosemirror-model';

const EDITOR_CLS = 'sn-editor';

const docSpec: NodeSpec = {
  content: 'block+',
  toDOM(node) {
    return [
      'main',
      { 'class': EDITOR_CLS },
      0,
    ];
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
    return [
      'h1',
      { 'class': EDITOR_CLS },
      0,
    ];
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
    return [
      'h2',
      { 'class': EDITOR_CLS },
      0
    ];
  },
  parseDOM: [{ tag: 'h2' }],
};

const paragraphSpec: NodeSpec = {
  content: 'inline*',
  group: 'block',
  marks: '_',
  toDOM(node) {
    return [
      'p',
      { 'class': EDITOR_CLS },
      0,
    ];
  },
  parseDOM: [{ tag: 'p' }],
};

const checklistItemSpec: NodeSpec = {
  attrs: {
    checked: {
      default: false,
    },
  },
  content: 'inline*',
  defining: true,
  group: 'block',
  marks: '_',
  toDOM(node) {
    return [
      'div',
      { 'class': 'checklist-item' },
      [
        'input',
        {
          type: 'checkbox',
          ...(node.attrs.checked && { checked: 'true' }),
        },
      ],
      [
        'p',
        0
      ],
    ];
  },
  parseDOM: [{
    contentElement: 'p',
    tag: 'div.checklist-item',
    getAttrs(node) {
      // Will be type Node when parseDOM supplies a 'tag' rule
      const input = (node as HTMLElement).querySelector('input');
      return {
        checked: !!(input as HTMLInputElement).checked,
      };
    },
  }],
};

const textSpec: NodeSpec = {
  group: 'inline',
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
    },
    ordered_list: {
      ...orderedList,
      content: 'list_item+',
      group: 'block',
    },
    list_item: {
      ...listItem,
      content: 'paragraph+',
    },
    heading1: heading1Spec,
    heading2: heading2Spec,
    text: textSpec,
  },
  marks: {
    link: marks.link,
    em: marks.em,
    strong: marks.strong,
    code: marks.code,
  },
};

export const schema = new Schema(spec);
