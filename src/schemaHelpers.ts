import { Node } from 'prosemirror-model';
import { schema } from './schema';

export function isListBlock(
  node: Node,
  listTypes = [schema.nodes.unordered_list, schema.nodes.ordered_list],
): boolean {
  return listTypes.includes(node.type);
}
