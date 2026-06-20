import { Fragment } from 'react';
import { Table } from 'react-bootstrap';

import { CodeChip } from '../design/components/CodeChip';
import { RequiredMark } from '../design/components/RequiredMark';
import { resolveType, type DescNode } from './paramTypes';

function Rows({ properties, namespace }: { properties: Record<string, DescNode>; namespace?: string }) {
  return (
    <>
      {Object.entries(properties).map(([name, node]) => {
        const path = namespace ? `${namespace}.${name}` : name;
        return (
          <Fragment key={path}>
            <tr>
              <td>
                <CodeChip>{path}</CodeChip>
              </td>
              <td>
                {node.description ? node.description : <span className="sb-muted">—</span>}
              </td>
              <td>
                <CodeChip variant="type">{resolveType(node)}</CodeChip>
              </td>
              <td>{node.optional ? '' : <RequiredMark />}</td>
            </tr>
            {node.properties && <Rows properties={node.properties} namespace={path} />}
          </Fragment>
        );
      })}
    </>
  );
}

/** Recursive table of parameter/property descriptions. */
export function ParamsTable({ properties }: { properties: Record<string, DescNode> }) {
  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Description</th>
          <th>Type</th>
          <th>Required</th>
        </tr>
      </thead>
      <tbody>
        <Rows properties={properties} />
      </tbody>
    </Table>
  );
}
