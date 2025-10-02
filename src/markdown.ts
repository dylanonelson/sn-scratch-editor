import markdownit from 'markdown-it';
import {
  MarkdownParser,
  MarkdownSerializer,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import {
  AUTO_LINK_ATTR,
  MARKDOWN_ESCAPED_ATTR,
  CheckboxStatus,
  schema,
} from './schema';

export const markdownSerializer = new MarkdownSerializer(
  {
    heading1(state, node, parent, index) {
      state.write('# ');
      state.renderInline(node);
      state.closeBlock(node);
    },
    heading2(state, node, parent, index) {
      state.write('## ');
      state.renderInline(node);
      state.closeBlock(node);
    },
    heading3(state, node, parent, index) {
      state.write('### ');
      state.renderInline(node);
      state.closeBlock(node);
    },
    checklist_item(state, node, parent, index) {
      const boxText =
        node.attrs.status === CheckboxStatus.DONE ? '[x] ' : '[ ] ';
      state.write(boxText);
      state.renderInline(node);
      state.closeBlock(node);
    },
    paragraph(state, node, parent, index) {
      if (node.nodeSize === 2) {
        // Write a non-breaking empty space so markdown retains the line as an empty paragraph
        state.write('\u00A0');
        state.closeBlock(node);
        return;
      }
      defaultMarkdownSerializer.nodes.paragraph(state, node, parent, index);
    },
    list_item(state, node, parent, index) {
      defaultMarkdownSerializer.nodes.list_item(state, node, parent, index);
    },
    ordered_list(state, node, parent, index) {
      defaultMarkdownSerializer.nodes.ordered_list(state, node, parent, index);
    },
    unordered_list(state, node, parent, index) {
      defaultMarkdownSerializer.nodes.bullet_list(state, node, parent, index);
    },
    text(state, node, parent, index) {
      defaultMarkdownSerializer.nodes.text(state, node, parent, index);
    },
    code_block(state, node, parent, index) {
      if (node.attrs[MARKDOWN_ESCAPED_ATTR]) {
        state.write(node.textContent);
        state.ensureNewLine();
      } else {
        defaultMarkdownSerializer.nodes.code_block(state, node, parent, index);
      }
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
    inline_link: defaultMarkdownSerializer.marks.link,
    code: {
      close(state, mark) {
        return mark.attrs[MARKDOWN_ESCAPED_ATTR] ? '' : '`';
      },
      escape: false,
      open(state, mark) {
        return mark.attrs[MARKDOWN_ESCAPED_ATTR] ? '' : '`';
      },
    },
  },
);

const markdownItParser = markdownit();
const Token = markdownItParser.core.State.prototype.Token;
// We need to access the default image parser rule so we can wrap it in custom
// logic. These methods and objects are meant to be internal but there seems to
// be no other way to get at the default rules.
// @ts-ignore
const imageRuleIndex = markdownItParser.inline.ruler.__find__('image');
const defaultImageRule =
  // @ts-ignore
  markdownItParser.inline.ruler.__rules__[imageRuleIndex].fn;

const CHECKLIST_ITEM_OPEN_MARKERS = ['[x]', '[X]', '[ ]'];

markdownItParser.use((md) => {
  md.core.ruler.after('block', 'checklist_item', (coreState) => {
    const srcLines = coreState.src.split('\n');
    let isChecklistOpen = false;
    let hasChecklist = false;

    coreState.tokens = coreState.tokens.map((token) => {
      if (isChecklistOpen && token.type === 'inline') {
        token.content = token.content.slice(3).trimLeft();
      }
      if (token.type === 'paragraph_open') {
        const [startLine, endLine] = token.map;
        const content = srcLines[startLine];
        if (CHECKLIST_ITEM_OPEN_MARKERS.includes(content.slice(0, 3))) {
          hasChecklist = true;
          isChecklistOpen = true;
          const { Token } = coreState;
          const token = new Token('checklist_item_open', 'div', 1);
          token.attrPush([
            'status',
            content[1].toLowerCase() === 'x'
              ? CheckboxStatus.DONE.toString()
              : CheckboxStatus.EMPTY.toString(),
          ]);
          return token;
        }
      } else if (isChecklistOpen && token.type === 'paragraph_close') {
        isChecklistOpen = false;
        return new coreState.Token('checklist_item_close', 'div', -1);
      }

      return token;
    });

    return hasChecklist;
  });

  md.inline.ruler.at('image', (inlineState) => {
    const { pos: originalPos } = inlineState;
    const result = defaultImageRule(inlineState);
    if (result) {
      const codeToken = new inlineState.Token('code_inline', 'code', 0);
      codeToken.markup = '`';
      codeToken.content = inlineState.src.slice(originalPos, inlineState.pos);
      codeToken.attrSet(MARKDOWN_ESCAPED_ATTR, 'true');
      inlineState.tokens[inlineState.tokens.length - 1] = codeToken;
    }
    return result;
  });
});

class ScratchTokenParser {
  private fullTokenList: markdownit.Token[];
  private tokenStack: markdownit.Token[];
  private parseable: boolean;
  private src: string;

  static DOCUMENT_MAP = new Map([
    ['heading1', ['inline']],
    ['heading2', ['inline']],
    ['heading3', ['inline']],
    ['paragraph', ['inline']],
    ['fence', ['inline']],
    ['bullet_list', ['list_item', 'inline']],
    ['ordered_list', ['list_item', 'inline']],
    ['list_item', ['paragraph', 'ordered_list', 'bullet_list']],
    ['checklist_item', ['inline']],
    ['inline', []],
  ]);

  static getTypeName(tokenType: string) {
    return tokenType.replace('_open', '').replace('_close', '');
  }

  constructor(src: string) {
    this.resetInternalState();
    this.src = src;
  }

  take(token: markdownit.Token): null | markdownit.Token[] {
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
      codeToken.attrPush([MARKDOWN_ESCAPED_ATTR, 'true']);
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
      if (type.startsWith('heading') && tag === 'h3') {
        token.type = type.replace('heading', 'heading3');
      }
      if (type === 'link' && token.attrGet('href') === token.content) {
        token.attrSet(AUTO_LINK_ATTR, 'true');
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
        return token.attrGet(MARKDOWN_ESCAPED_ATTR) === 'true'
          ? { [MARKDOWN_ESCAPED_ATTR]: true }
          : {};
      },
    },
    heading1: { block: 'heading1' },
    heading2: { block: 'heading2' },
    heading3: { block: 'heading3' },
    list_item: { block: 'list_item' },
    ordered_list: { block: 'ordered_list' },
    paragraph: { block: 'paragraph' },
    checklist_item: {
      block: 'checklist_item',
      getAttrs(tok) {
        return {
          status:
            tok.attrGet('status') === CheckboxStatus.DONE.toString()
              ? CheckboxStatus.DONE
              : CheckboxStatus.EMPTY,
        };
      },
    },
    em: { mark: 'em' },
    strong: { mark: 'strong' },
    code_inline: {
      getAttrs(token) {
        return token.attrGet(MARKDOWN_ESCAPED_ATTR) === 'true'
          ? { [MARKDOWN_ESCAPED_ATTR]: true }
          : {};
      },
      mark: 'code',
      noCloseToken: true,
    },
    link: {
      mark: 'link',
      getAttrs(tok) {
        return {
          href: tok.attrGet('href'),
          title: tok.attrGet('title') || null,
          ...(tok.info === 'auto' && {
            [AUTO_LINK_ATTR]: true,
          }),
        };
      },
    },
  },
);
