import { MarkType, Node, NodeType } from 'prosemirror-model';
import { builders } from 'prosemirror-test-builder';
import { markdownParser, markdownSerializer } from './markdown';
import { AUTO_LINK_ATTR, schema } from './schema';

const schemaHelpers = builders(schema, {});

function fl(txt: string, indent: null | number = null) {
  let t = txt.split('\n');
  if (t[0] === '') t = t.slice(1);
  return t.map((l) => (indent ? l.slice(indent) : l.trim())).join('\n');
}

function expectBlockResultTuplesToMatch(result, expected) {
  result.forEach(([first, second, third], i) => {
    expect(first).toBe(expected[i][0]);
    expect(second).toBe(expected[i][1]);
    expect(third).toEqual(expected[i][2]);
  });
}

function expectNestedBlockResultTuplesToMatch(result, expected, depth = 0) {
  if (result.t !== expected.t) {
    throw new Error(
      `Expected node type ${expected.t.name} at depth ${depth}, got ${result.t.name}`,
    );
  }
  expect(result.a).toEqual(expected.a);
  expect(typeof result.c).toBe(typeof expected.c);
  expect(result.c.length).toBe(expected.c.length);
  if (Array.isArray(result.c)) {
    const childDepth = depth + 1;
    result.c.forEach((child, i) => {
      expectNestedBlockResultTuplesToMatch(child, expected.c[i], childDepth);
    });
  } else {
    expect(result.c).toBe(expected.c);
  }
}

interface NestedBlockResult {
  // Node type
  t: NodeType;
  // Attrs
  a: {};
  // Children or text content
  c: string | NestedBlockResult[];
}

function getNestedBlockResult(node: Node): NestedBlockResult {
  const children: NestedBlockResult[] = [];
  const result: NestedBlockResult = {
    t: node.type,
    a: node.attrs,
    c: node.isTextblock ? node.textContent : children,
  };
  if (!node.isTextblock) {
    for (let i = 0; i < node.childCount; i += 1) {
      const child = node.child(i);
      children.push(getNestedBlockResult(child));
    }
  }
  return result;
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

function parseTestNestedBlockHelper(
  mdString: string,
  expected: NestedBlockResult,
) {
  const result = markdownParser.parse(mdString);
  expectNestedBlockResultTuplesToMatch(getNestedBlockResult(result), expected);
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

    it('parses unordered lists when used with "+" and "*"', () => {
      parseTestBlockHelper(
        fl(`
        # Asterisk list
        * first item
        * second item

        # Plus list
        + first item
        + second item
      `),
        [
          [schema.nodes.heading1, 'Asterisk list', {}],
          [schema.nodes.unordered_list, 'first itemsecond item', {}],
          [schema.nodes.heading1, 'Plus list', {}],
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

    it('parses multiple levels of headings', () => {
      parseTestBlockHelper(
        fl(`
        ## Heading 2

        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

        ### Heading 3
      `),
        [
          [schema.nodes.heading2, 'Heading 2', {}],
          [
            schema.nodes.paragraph,
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            {},
          ],
          [schema.nodes.heading3, 'Heading 3', {}],
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

    it('parses nested lists as lists', () => {
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
          [schema.nodes.unordered_list, 'top levelnext level', {}],
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

    it('parses every level of nested lists', () => {
      parseTestNestedBlockHelper(
        fl(
          `
        - top level
            - next level
            - next level again
        - top level again
        `,
          8,
        ),
        {
          t: schema.nodes.doc,
          a: {},
          c: [
            {
              t: schema.nodes.unordered_list,
              a: {},
              c: [
                {
                  t: schema.nodes.list_item,
                  a: {},
                  c: [
                    { t: schema.nodes.paragraph, a: {}, c: 'top level' },
                    {
                      t: schema.nodes.unordered_list,
                      a: {},
                      c: [
                        {
                          t: schema.nodes.list_item,
                          a: {},
                          c: [
                            {
                              t: schema.nodes.paragraph,
                              a: {},
                              c: 'next level',
                            },
                          ],
                        },
                        {
                          t: schema.nodes.list_item,
                          a: {},
                          c: [
                            {
                              t: schema.nodes.paragraph,
                              a: {},
                              c: 'next level again',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  t: schema.nodes.list_item,
                  a: {},
                  c: [
                    {
                      t: schema.nodes.paragraph,
                      a: {},
                      c: 'top level again',
                    },
                  ],
                },
              ],
            },
          ],
        },
      );
    });
    it('parses horizontal rules', () => {
      const parsed = markdownParser.parse(
        fl(`
        First

        ---

        Second
        `),
      );
      const ruleNode = parsed.child(1);
      expect(ruleNode.type.name).toBe(schema.nodes.horizontal_rule.name);
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
              [
                schema.marks.link,
                {
                  href: 'https://example.com',
                  title: null,
                  [AUTO_LINK_ATTR]: false,
                },
              ],
            ]),
          ],
        ],
      );
    });

    it('parses autolinks', () => {
      parseTestInlineHelper(
        fl(`
        Check out <https://standardnotes.org> for more info
      `),
        [
          ['Check out ', new Map()],
          [
            'https://standardnotes.org',
            new Map([
              [
                schema.marks.link,
                {
                  href: 'https://standardnotes.org',
                  title: null,
                  [AUTO_LINK_ATTR]: true,
                },
              ],
            ]),
          ],
          [' for more info', new Map()],
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

describe('serializer', () => {
  describe('block serialization', () => {
    it('serializes a basic document', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.heading1('Heading 1'),
        schemaHelpers.paragraph('A paragraph.'),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('# Heading 1\n\nA paragraph.');
    });

    it('serializes unordered lists', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.heading1('To do'),
        schemaHelpers.unordered_list(
          schemaHelpers.list_item('first item'),
          schemaHelpers.list_item('second item'),
        ),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('# To do\n\n* first item\n\n* second item');
    });

    it('serializes a doc with only an unordered list in it', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.unordered_list(
          schemaHelpers.list_item('first item'),
          schemaHelpers.list_item('second item'),
        ),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('* first item\n\n* second item');
    });

    it('serializes nested lists', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.heading2('Nested'),
        schemaHelpers.unordered_list(
          schemaHelpers.list_item(
            schemaHelpers.paragraph('top level'),
            schemaHelpers.unordered_list(
              schemaHelpers.list_item(schemaHelpers.paragraph('next level')),
            ),
          ),
        ),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('## Nested\n\n* top level\n\n  * next level');
    });

    it('serializes code blocks', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.heading2('Code sample'),
        schemaHelpers.code_block({ markdown_escaped: false }, 'npm run test'),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('## Code sample\n\n```\nnpm run test\n```');
    });

    it('serializes checklist items', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.checklist_item({ status: 1 }, 'not done'),
        schemaHelpers.checklist_item({ status: 0 }, 'done'),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('[ ] not done\n\n[x] done');
    });
  });

  describe('leaf node serialization', () => {
    it('serializes horizontal rules', () => {
      const doc = schemaHelpers.doc(schemaHelpers.horizontal_rule());
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('---');
    });
    it('serializes horizontal rules inside documents', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.paragraph('First'),
        schemaHelpers.horizontal_rule(),
        schemaHelpers.paragraph('Second'),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('First\n\n---\n\nSecond');
    });
  });

  describe('inline node serialization', () => {
    it('serializes emphasis', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.paragraph('Sounds ', schemaHelpers.em('good')),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('Sounds *good*');
    });

    it('serializes strong', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.paragraph('Sounds ', schemaHelpers.strong('great')),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('Sounds **great**');
    });

    it('serializes links', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.paragraph(
          'Click ',
          schemaHelpers.link(
            {
              href: 'https://example.com',
              title: null,
              [AUTO_LINK_ATTR]: false,
            },
            'here',
          ),
        ),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('Click [here](https://example.com)');
    });

    it('serializes autolinks', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.paragraph(
          'Check out ',
          schemaHelpers.link(
            {
              href: 'https://standardnotes.org',
              title: null,
              [AUTO_LINK_ATTR]: true,
            },
            'https://standardnotes.org',
          ),
          ' for more info',
        ),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe(
        'Check out <https://standardnotes.org> for more info',
      );
    });

    it('serializes combined marks', () => {
      const doc = schemaHelpers.doc(
        schemaHelpers.paragraph(
          'Definitely ',
          schemaHelpers.strong(schemaHelpers.em('do')),
        ),
      );
      const result = markdownSerializer.serialize(doc);
      expect(result).toBe('Definitely ***do***');
    });
  });
});

describe('From Markdown to ProseMirror and back', () => {
  it('roundtrips a basic document', () => {
    const md = '# Heading 1\n\nA paragraph.';
    const parsed = markdownParser.parse(md);
    const result = markdownSerializer.serialize(parsed);
    expect(result).toBe(md);
  });

  it('roundtrips a doc with only an unordered list in it', () => {
    const md = '* first item\n\n* second item';
    const parsed = markdownParser.parse(md);
    const result = markdownSerializer.serialize(parsed);
    expect(result).toBe(md);
  });

  it('roundtrips a doc with a horizontal rule in it', () => {
    const md = fl(`
      # Section 1

      paragraph

      ---

      # Section 2

      * a list

      * of stuff`);
    const parsed = markdownParser.parse(md);
    const result = markdownSerializer.serialize(parsed);
    expect(result).toBe(md);
  });
});
