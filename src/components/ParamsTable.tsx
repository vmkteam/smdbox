import { Fragment } from 'react';
import { Table } from 'react-bootstrap';

import { CodeChip } from '../design/components/CodeChip';
import { RequiredMark } from '../design/components/RequiredMark';
import { useSetToggle } from '../hooks/useSetToggle';
import type { SmdDefinition } from '../types/smd';
import { CollapseCaret } from './CollapseCaret';
import { referencedTypeName, resolveType, type DescNode } from './paramTypes';

interface RowsProps {
  properties: Record<string, DescNode>;
  definitions: Record<string, SmdDefinition>;
  depth: number;
  /** Dotted path of the parent row (for collapse keys); '' at the top level. */
  parentPath: string;
  /** Definition names already expanded on this path (cycle guard). */
  seen: ReadonlySet<string>;
  collapsed: ReadonlySet<string>;
  onToggle: (path: string) => void;
}

/** Resolves the child rows for a node: inline properties or a referenced definition. */
function childrenOf(
  node: DescNode,
  definitions: Record<string, SmdDefinition>,
  seen: ReadonlySet<string>,
): { rows?: Record<string, DescNode>; seen: ReadonlySet<string> } {
  if (node.properties && Object.keys(node.properties).length) {
    return { rows: node.properties, seen };
  }
  const ref = referencedTypeName(node);
  const def = ref && !seen.has(ref) ? definitions[ref] : undefined;
  if (def?.properties && Object.keys(def.properties).length) {
    return { rows: def.properties as Record<string, DescNode>, seen: new Set(seen).add(ref) };
  }
  return { seen };
}

function Rows({ properties, definitions, depth, parentPath, seen, collapsed, onToggle }: RowsProps) {
  return (
    <>
      {Object.entries(properties).map(([name, node]) => {
        const path = parentPath ? `${parentPath}.${name}` : name;
        const { rows, seen: childSeen } = childrenOf(node, definitions, seen);
        const isCollapsed = collapsed.has(path);
        const enums = node.enum?.filter((v) => v !== undefined && v !== null) ?? [];
        const typeLabel = resolveType(node);
        // Drop descriptions that merely echo the type name (zenrpc default).
        const desc = node.description && node.description !== typeLabel ? node.description : '';
        return (
          <Fragment key={path}>
            <tr>
              <td style={{ paddingLeft: depth * 18 + 8 }}>
                {rows ? (
                  <CollapseCaret open={!isCollapsed} onToggle={() => onToggle(path)} name={name} />
                ) : (
                  <span className="sb-params__caret" aria-hidden="true" />
                )}
                <span className="sb-params__req">{node.optional ? null : <RequiredMark />}</span>
                <CodeChip>{name}</CodeChip>
                <span className="sb-params__type">
                  <CodeChip variant="type">{typeLabel}</CodeChip>
                </span>
              </td>
              <td>
                {desc ? desc : <span className="sb-muted">—</span>}
                {enums.length > 0 && (
                  <div className="sb-params__enum">
                    {enums.map((v, i) => (
                      <CodeChip key={i} variant="type">
                        {String(v)}
                      </CodeChip>
                    ))}
                  </div>
                )}
              </td>
            </tr>
            {rows && !isCollapsed && (
              <Rows
                properties={rows}
                definitions={definitions}
                depth={depth + 1}
                parentPath={path}
                seen={childSeen}
                collapsed={collapsed}
                onToggle={onToggle}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * Single flat table of parameters/properties. Nested object types (inline
 * properties or `$ref` definitions) are expanded inline as indented rows, with
 * a chevron to collapse/expand each branch; there are no separate
 * "Definition of X" tables.
 */
export function ParamsTable({
  properties,
  definitions = {},
}: {
  properties: Record<string, DescNode>;
  definitions?: Record<string, SmdDefinition>;
}) {
  const [collapsed, onToggle] = useSetToggle();

  return (
    <Table striped bordered hover size="sm" responsive className="sb-params">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <Rows
          properties={properties}
          definitions={definitions}
          depth={0}
          parentPath=""
          seen={new Set()}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      </tbody>
    </Table>
  );
}
