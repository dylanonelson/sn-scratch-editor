// In environments where the Standard Notes client has no effect,
// this module will be swapped in for client.ts.

import { DOMParser } from 'prosemirror-model';
import demoMarkdown from './demoDocs.md';
import { schema } from './schema';
import { markdownSerializer } from './markdown';

class DemoClient {
  constructor() {}
  get latestText() {
    return demoMarkdown;
  }
  ready() {
    return Promise.resolve();
  }
  onUpdate() {}
  saveNote() {}
}

export const client = new DemoClient();
