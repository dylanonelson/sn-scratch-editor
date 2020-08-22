import { MarkType, Node, NodeType } from 'prosemirror-model';
import { schema } from './schema';
import { markdownParser, markdownSerializer } from './markdown';

function fl(txt: string, indent: null | number = null) {
  return txt
    .split('\n')
    .map((l) => (indent ? l.slice(indent) : l.trim()))
    .join('\n');
}

function expectBlockResultTuplesToMatch(result, expected) {
  result.forEach(([first, second, third], i) => {
    expect(first).toBe(expected[i][0]);
    expect(second).toBe(expected[i][1]);
    expect(third).toEqual(expected[i][2]);
  });
}

function getBlockResultTuple(node: Node): [NodeType, string][] {
  const result = [];
  for (let i = 0; i < node.childCount; i += 1) {
    const child = node.child(i);
    result.push([child.type, child.textContent, child.attrs]);
  }
  return result;
}

function parseTestBlockHelper(
  mdString: string,
  expected: [NodeType, string, {}][],
) {
  const result = markdownParser.parse(mdString);
  expectBlockResultTuplesToMatch(getBlockResultTuple(result), expected);
}

function expectInlineResultTuplesToMatch(result, expected) {
  result.forEach(([first, second], i) => {
    expect(first).toBe(expected[i][0]);
    expect(second.size).toBe(expected[i][1].length);
    second.forEach((mark) => {
      const hasExpected = expected[i][1].has(mark.type);
      if (!hasExpected) {
        throw new Error(`Unexpected mark type: ${mark.type.name}`);
      }
      const expectedAttrs = expected[i][1].get(mark.type);
      expect(mark.attrs).toEqual(expectedAttrs);
    });
  });
}

function parseTestInlineHelper(
  mdString: string,
  expected: [string, Map<MarkType, {}>][],
) {
  const resultNode = markdownParser.parse(mdString);
  const firstNode = resultNode.child(0);
  const result = [];
  for (let i = 0; i < firstNode.childCount; i += 1) {
    const child = firstNode.child(i);
    result.push([child.text, child.marks]);
  }
  expectInlineResultTuplesToMatch(result, expected);
}

describe('parser', () => {
  describe('block parsing', () => {
    it('parses a basic document', () => {
      parseTestBlockHelper(
        fl(`
        # Heading 1

        A paragraph.
      `),
        [
          [schema.nodes.heading1, 'Heading 1', {}],
          [schema.nodes.paragraph, 'A paragraph.', {}],
        ],
      );
    });

    it('parses unordered lists', () => {
      parseTestBlockHelper(
        fl(`
        # To do
        - first item
        - second item
      `),
        [
          [schema.nodes.heading1, 'To do', {}],
          [schema.nodes.unordered_list, 'first itemsecond item', {}],
        ],
      );
    });

    it('parses code blocks', () => {
      parseTestBlockHelper(
        fl(`
        ## Code sample

        \`\`\`
        npm run test
        \`\`\`
      `),
        [
          [schema.nodes.heading2, 'Code sample', {}],
          [
            schema.nodes.code_block,
            'npm run test',
            { markdown_escaped: false },
          ],
        ],
      );
    });

    it('parses checklist items', () => {
      parseTestBlockHelper(
        fl(`
        [ ] not done

        [x] done
      `),
        [
          [schema.nodes.checklist_item, 'not done', { status: 1 }],
          [schema.nodes.checklist_item, 'done', { status: 0 }],
        ],
      );
    });

    it("doesn't parse nested lists", () => {
      parseTestBlockHelper(
        fl(
          `
        ## Nested

        - top level
          - next level
      `,
          8,
        ),
        [
          [schema.nodes.heading2, 'Nested', {}],
          [
            schema.nodes.code_block,
            '- top level\n  - next level',
            { markdown_escaped: true },
          ],
        ],
      );
    });

    it("doesn't parse blockquotes", () => {
      parseTestBlockHelper(
        fl(
          `
        Opening paragraph.

        > Winged words
      `,
          8,
        ),
        [
          [schema.nodes.paragraph, 'Opening paragraph.', {}],
          [
            schema.nodes.code_block,
            '> Winged words',
            { markdown_escaped: true },
          ],
        ],
      );
    });
  });

  describe('inline node parsing', () => {
    it('parses italics', () => {
      parseTestInlineHelper(
        fl(`
        Sounds *good*
      `),
        [
          ['Sounds ', new Map()],
          ['good', new Map([[schema.marks.em, {}]])],
        ],
      );
    });

    it('parses bold', () => {
      parseTestInlineHelper(
        fl(`
        Sounds __great__
      `),
        [
          ['Sounds ', new Map()],
          ['great', new Map([[schema.marks.strong, {}]])],
        ],
      );
    });

    it('parses links', () => {
      parseTestInlineHelper(
        fl(`
        Click [here](https://example.com)
      `),
        [
          ['Click ', new Map()],
          [
            'here',
            new Map([
              [schema.marks.link, { href: 'https://example.com', title: null }],
            ]),
          ],
        ],
      );
    });

    it('combines marks', () => {
      parseTestInlineHelper(
        fl(`
        Definitely __*do*__
      `),
        [
          ['Definitely ', new Map()],
          [
            'do',
            new Map([
              [schema.marks.strong, {}],
              [schema.marks.em, {}],
            ]),
          ],
        ],
      );
    });

    it("doesn't parse images", () => {
      parseTestInlineHelper(
        fl(`
        ![adorbs](cat.png)
      `),
        [
          [
            '![adorbs](cat.png)',
            new Map([[schema.marks.code, { markdown_escaped: true }]]),
          ],
        ],
      );
    });
  });
});
