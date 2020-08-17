import markdownit from 'markdown-it';
import Token from 'markdown-it/lib/token';
import markdownItTaskLists from 'markdown-it-task-lists';
import {
  MarkdownParser,
  MarkdownSerializer,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import { CheckboxStatus, schema } from './schema';

export const markdownSerializer = new MarkdownSerializer(
  {
    heading1(state, node) {
      state.write('# ');
      state.renderInline(node);
      state.closeBlock(node);
    },
    heading2(state, node) {
      state.write('## ');
      state.renderInline(node);
      state.closeBlock(node);
    },
    checklist_item(state, node) {
      const boxText = node.attrs.status === CheckboxStatus.DONE ? '[x]' : '[ ]';
      state.write(`- ${boxText} `);
      state.renderInline(node);
      state.closeBlock(node);
    },
    paragraph(state, node) {
      defaultMarkdownSerializer.nodes.paragraph(state, node);
    },
    list_item(state, node) {
      defaultMarkdownSerializer.nodes.list_item(state, node);
    },
    ordered_list(state, node) {
      defaultMarkdownSerializer.nodes.ordered_list(state, node);
    },
    unordered_list(state, node) {
      defaultMarkdownSerializer.nodes.bullet_list(state, node);
    },
    text(state, node) {
      defaultMarkdownSerializer.nodes.text(state, node);
    },
    code_block(state, node) {
      if (node.attrs.markdown_escape) {
        state.write(node.textContent);
        state.ensureNewLine();
      } else {
        defaultMarkdownSerializer.nodes.code_block(state, node);
      }
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
  },
);

const markdownItParser = markdownit();
markdownItParser.use(markdownItTaskLists);

class ContainerStack {
  private fullTokenList: Token[];
  private tokenStack: Token[];
  private parseable: boolean;
  private src: string;

  static CONTAINER_TYPES = [
    'bullet_list',
    'ordered_list',
    'blockquote',
    'table',
  ];

  constructor(src: string) {
    this.fullTokenList = [];
    this.tokenStack = [];
    this.parseable = true;
    this.src = src;
  }

  take(token: Token): null | Token[] {
    const { nesting, type } = token;

    // Either we are inside a container node already or we are entering one
    const shouldProcessToken = Boolean(
      ContainerStack.CONTAINER_TYPES.some((typeName) =>
        type.startsWith(typeName),
      ) || this.tokenStack.length,
    );

    if (shouldProcessToken) {
      this.fullTokenList.push(token);
    }

    if (shouldProcessToken && nesting > 0) {
      const currentStackHeight = this.tokenStack.length;

      if (
        currentStackHeight > 2 ||
        (currentStackHeight === 1 && type.startsWith('list_item') === false) ||
        (currentStackHeight === 2 && type.startsWith('paragraph') === false)
      ) {
        this.parseable = false;
      }

      this.tokenStack.push(token);
      return;
    }

    if (shouldProcessToken && nesting < 0) {
      this.tokenStack.pop();

      if (this.tokenStack.length === 0) {
        const { fullTokenList, parseable } = this;

        this.fullTokenList = [];
        this.tokenStack = [];
        this.parseable = true;

        if (parseable === false) {
          const {
            map: [endLine, startLine],
          } = fullTokenList[0];
          const codeToken = new Token('fence', 'code', 0);
          codeToken.content = this.src
            .split('\n')
            .slice(endLine, startLine)
            .join('\n');
          codeToken.attrPush(['markdown_escape', 'true']);
          return [codeToken];
        }

        return fullTokenList;
      }
    }

    if (shouldProcessToken === false) {
      return [token];
    }

    return null;
  }
}

const parserShim = () => ({
  parse(...args) {
    console.log(markdownItParser);
    (window as any).mip = markdownItParser;
    // @ts-ignore
    const initial = markdownItParser.parse(...args);
    const out = [];
    const containerStack = new ContainerStack(args[0]);

    console.log('initial', initial);

    for (let i = 0; i < initial.length; i++) {
      const token = initial[i];
      const { nesting, tag, type } = token;

      if (type.startsWith('heading') && tag === 'h1') {
        token.type = token.type.replace('heading', 'heading1');
      }
      if (type.startsWith('heading') && tag === 'h2') {
        token.type = type.replace('heading', 'heading2');
      }

      const stackOutput = containerStack.take(token);

      if (stackOutput) {
        out.push(...stackOutput);
      }
    }

    return out;
  },
});

export const markdownParser = new MarkdownParser(
  schema,
  // @ts-ignore
  parserShim(),
  {
    blockquote: { block: 'code_block' },
    bullet_list: { block: 'unordered_list' },
    fence: {
      block: 'code_block',
      getAttrs(token) {
        return token.attrGet('markdown_escape') === 'true'
          ? { markdown_escape: true }
          : {};
      },
    },
    heading1: { block: 'heading1' },
    heading2: { block: 'heading2' },
    list_item: { block: 'list_item' },
    ordered_list: { block: 'ordered_list' },
    paragraph: { block: 'paragraph' },
  },
);
