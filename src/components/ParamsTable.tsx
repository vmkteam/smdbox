import { Fragment } from 'react';
import { Table } from 'react-bootstrap';

import { CodeChip } from '../design/components/CodeChip';
import { RequiredMark } from '../design/components/RequiredMark';
import type { SmdDefinition } from '../types/smd';
import { referencedTypeName, resolveType, type DescNode } from './paramTypes';

interface RowsProps {
  properties: Record<string, DescNode>;
  definitions: Record<string, SmdDefinition>;
  depth: number;
  /** Definition names already expanded on this path (cycle guard). */
  seen: ReadonlySet<string>;
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

function Rows({ properties, definitions, depth, seen }: RowsProps) {
  return (
    <>
      {Object.entries(properties).map(([name, node]) => {
        const { rows, seen: childSeen } = childrenOf(node, definitions, seen);
        const enums = node.enum?.filter((v) => v !== undefined && v !== null) ?? [];
        const typeLabel = resolveType(node);
        // Drop descriptions that merely echo the type name (zenrpc default).
        const desc = node.description && node.description !== typeLabel ? node.description : '';
        return (
          <Fragment key={`${depth}:${name}`}>
            <tr>
              <td style={{ paddingLeft: depth * 18 + 8 }}>
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
            {rows && (
              <Rows properties={rows} definitions={definitions} depth={depth + 1} seen={childSeen} />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * Single flat table of parameters/properties. Nested object types (inline
 * properties or `$ref` definitions) are expanded inline as indented rows, so
 * there are no separate "Definition of X" tables.
 */
export function ParamsTable({
  properties,
  definitions = {},
}: {
  properties: Record<string, DescNode>;
  definitions?: Record<string, SmdDefinition>;
}) {
  return (
    <Table striped bordered hover size="sm" className="sb-params">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <Rows properties={properties} definitions={definitions} depth={0} seen={new Set()} />
      </tbody>
    </Table>
  );
}
