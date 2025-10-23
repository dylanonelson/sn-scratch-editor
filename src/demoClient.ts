// In environments where the Standard Notes client has no effect,
// this module will be swapped in for client.ts.

import demoMarkdown from './demoDocs.md';

// Dynamically import all markdown files from the sample_docs directory using import.meta.glob (for Vite or similar build tools).
// This will provide a mapping of filenames to modules.
const ctx = require.context('./sample_docs', true, /\.md$/);

const sampleDocs = ctx.keys().reduce((acc, path) => {
  // path looks like './sample_docs/SomeFile.md'
  const doc = ctx(path).default;
  const name = path.replace('./', '').replace('.md', '');
  acc[name] = doc;
  return acc;
}, {});

console.log(sampleDocs);

class DemoClient {
  constructor() {}
  get latestText() {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && sampleDocs.hasOwnProperty(lastSegment)) {
      return sampleDocs[lastSegment];
    }
    return demoMarkdown;
  }
  ready() {
    return Promise.resolve();
  }
  onUpdate() {}
  saveNote(jsonDoc: {}, mdDoc: string, textPreview: string) {
    (window as any).saveNoteArgs = { jsonDoc, mdDoc, textPreview };
  }
}

export const client = new DemoClient();
