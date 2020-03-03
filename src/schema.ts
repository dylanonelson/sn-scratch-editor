import { addListNodes } from 'prosemirror-schema-list';
import OrderedMap from 'orderedmap';

import {
  DOMOutputSpecArray,
  Node,
  NodeSpec,
  Schema,
} from 'prosemirror-model';

const EDITOR_CLS = 'sn-prose-editor';

const docSpec: NodeSpec = {
  content: 'block+',
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
};

const paragraphSpec: NodeSpec = {
  content: 'inline*',
  group: 'block',
  toDOM(node: Node): DOMOutputSpecArray {
    return [
      'p',
      { 'class': EDITOR_CLS },
      0,
    ];
  }
};

const textSpec: NodeSpec = {
  group: 'inline',
};

let spec = {
  nodes: OrderedMap.from({
    doc: docSpec,
    // Order matters here. pm apparently inserts the first valid node on enter.
    paragraph: paragraphSpec,
    heading1: heading1Spec,
    heading2: heading2Spec,
    text: textSpec,
  }),
  marks: OrderedMap.from({
  }),
};

export const schema = new Schema({
  nodes: addListNodes(spec.nodes, 'paragraph', 'block'),
  marks: spec.marks,
});
