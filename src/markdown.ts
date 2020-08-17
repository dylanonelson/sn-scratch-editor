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

class ScratchTokenParser {
  private fullTokenList: Token[];
  private tokenStack: Token[];
  private parseable: boolean;
  private src: string;

  static DOCUMENT_MAP = new Map([
    ['heading1', ['inline']],
    ['heading2', ['inline']],
    ['paragraph', ['inline']],
    ['fence', ['inline']],
    ['bullet_list', ['list_item', 'inline']],
    ['ordered_list', ['list_item', 'inline']],
    ['list_item', ['paragraph', 'inline']],
    ['inline', []],
  ]);

  static getTypeName(tokenType: string) {
    return tokenType.replace('_open', '').replace('_close', '');
  }

  constructor(src: string) {
    this.resetInternalState();
    this.src = src;
  }

  take(token: Token): null | Token[] {
    const { nesting } = token;
    let { type } = token;
    type = ScratchTokenParser.getTypeName(type);

    this.fullTokenList.push(token);

    if (
      ScratchTokenParser.DOCUMENT_MAP.has(type) === false &&
      type !== 'inline'
    ) {
      this.parseable = false;
    }

    if (this.parseable && this.tokenStack.length && nesting >= 0) {
      const parentType = ScratchTokenParser.getTypeName(
        this.tokenStack[this.tokenStack.length - 1].type,
      );

      if (
        ScratchTokenParser.DOCUMENT_MAP.get(parentType).includes(type) === false
      ) {
        this.parseable = false;
      }
    }

    if (nesting > 0) {
      this.tokenStack.push(token);
    }

    if (nesting < 0) {
      this.tokenStack.pop();
    }

    if (this.tokenStack.length === 0) {
      const out = this.getTokens();
      this.resetInternalState();
      return out;
    }

    return null;
  }

  private getTokens = () => {
    const { fullTokenList, parseable } = this;

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
  };

  private resetInternalState = () => {
    this.fullTokenList = [];
    this.tokenStack = [];
    this.parseable = true;
  };
}

const parserShim = () => ({
  parse(...args) {
    (window as any).mip = markdownItParser;
    // @ts-ignore
    const initial = markdownItParser.parse(...args);
    const out = [];
    const tokenParser = new ScratchTokenParser(args[0]);

    for (let i = 0; i < initial.length; i++) {
      const token = initial[i];
      const { nesting, tag, type } = token;

      if (type.startsWith('heading') && tag === 'h1') {
        token.type = token.type.replace('heading', 'heading1');
      }
      if (type.startsWith('heading') && tag === 'h2') {
        token.type = type.replace('heading', 'heading2');
      }

      const output = tokenParser.take(token);

      if (output) {
        out.push(...output);
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
