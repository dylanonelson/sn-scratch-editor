import {
  inputRules,
  smartQuotes,
  ellipsis,
  textblockTypeInputRule,
} from 'prosemirror-inputrules';
import { Plugin } from 'prosemirror-state';
import { schema } from './schema';

export const inputRulesPlugin = inputRules({
  rules: [
    ...smartQuotes,
    ellipsis,
    textblockTypeInputRule(/^# /, schema.nodes.heading2),
  ],
});
