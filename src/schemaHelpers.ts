import { Node, NodeRange, ResolvedPos } from 'prosemirror-model';
import { schema } from './schema';

export function isListBlock(
  node: Node,
  listTypes = [schema.nodes.unordered_list, schema.nodes.ordered_list],
): boolean {
  return listTypes.includes(node.type);
}

export function isListItemBlock(node: Node): boolean {
  return node.type === schema.nodes.list_item;
}

export function isParagraphBlock(node: Node): boolean {
  return node.type === schema.nodes.paragraph;
}

export function getListBlockRange(
  $from: ResolvedPos,
  $to: ResolvedPos,
  listTypes = [schema.nodes.unordered_list, schema.nodes.ordered_list],
): NodeRange | false {
  const listBlockRange = $from.blockRange($to, (node) =>
    isListBlock(node, listTypes),
  );
  return listBlockRange || false;
}
