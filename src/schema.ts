import {
  DOMOutputSpecArray,
  Node,
  NodeSpec,
  Schema,
} from 'prosemirror-model';

const docSpec: NodeSpec = {
  content: 'paragraph+',
};

const paragraphSpec: NodeSpec = {
  content: 'inline*',
  toDOM(node: Node): DOMOutputSpecArray {
    return [
      'p',
      0,
    ];
  }
};

const textSpec: NodeSpec = {
  group: 'inline',
};

export const schema = new Schema({
  nodes: {
    doc: docSpec,
    paragraph: paragraphSpec,
    text: textSpec,
  },
  marks: {
  },
});
