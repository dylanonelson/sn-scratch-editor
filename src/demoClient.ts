// In environments where the Standard Notes client has no effect,
// this module will be swapped in for client.ts.

import { DOMParser } from 'prosemirror-model';
import demoDocNode from './demo-doc.node';
import { schema } from './schema';
console.log('demo');

class DemoClient {
  constructor() {}
  get latestDoc() {
    return DOMParser.fromSchema(schema)
      .parse(demoDocNode).toJSON();
  }
  ready() {
    return Promise.resolve();
  }
  onUpdate() {}
  saveNote() {}
}

export const client = new DemoClient();
