export const NODE_TYPES = ['feature', 'module', 'dependency', 'screen', 'component'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export function isNodeType(t: string): t is NodeType {
  return (NODE_TYPES as readonly string[]).includes(t);
}

/** Edge direction is meaningful: source "feeds into" / is a dependency of target. */
export function isValidEdge(sourceId: string, targetId: string): boolean {
  return sourceId !== '' && targetId !== '' && sourceId !== targetId;
}
