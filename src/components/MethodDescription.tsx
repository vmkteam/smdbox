import { Alert, Tab, Table, Tabs } from 'react-bootstrap';

import { CodeChip } from '../design/components/CodeChip';
import { SectionTitle } from '../design/components/SectionTitle';
import type { SmdDefinition, SmdJsonSchema, SmdService } from '../types/smd';
import { ParamsTable } from './ParamsTable';
import { referencedTypeName, resolveType, type DescNode } from './paramTypes';

/** Converts the parameters array into a name->node map for the table. */
function paramsToProperties(params: SmdJsonSchema[]): Record<string, DescNode> {
  const out: Record<string, DescNode> = {};
  for (const param of params) {
    if (param.name) out[param.name] = param as DescNode;
  }
  return out;
}

/** Collects definitions from every node into one map, for inline resolution. */
function mergeDefinitions(nodes: SmdJsonSchema[]): Record<string, SmdDefinition> {
  const out: Record<string, SmdDefinition> = {};
  for (const node of nodes) Object.assign(out, node.definitions);
  return out;
}

function InputTab({ service }: { service: SmdService }) {
  const properties = paramsToProperties(service.parameters);
  if (!Object.keys(properties).length) {
    return <Alert variant="warning">No input properties specified in documentation</Alert>;
  }
  return (
    <div>
      <SectionTitle>Parameters</SectionTitle>
      <ParamsTable properties={properties} definitions={mergeDefinitions(service.parameters)} />
    </div>
  );
}

function OutputTab({ returns }: { returns: SmdJsonSchema }) {
  if (!returns.type) {
    return <Alert variant="warning">No output specified in documentation</Alert>;
  }
  const typeLabel = resolveType(returns as DescNode);
  // Skip the description when it merely repeats the type name (common for $ref results).
  const desc = returns.description && returns.description !== typeLabel ? returns.description : '';
  // Properties to expand: inline ones, or those of the referenced definition.
  const ref = referencedTypeName(returns as DescNode);
  const refProps = ref ? returns.definitions?.[ref]?.properties : undefined;
  const props = (returns.properties ?? refProps) as Record<string, DescNode> | undefined;
  const hasProps = props && Object.keys(props).length > 0;
  return (
    <div>
      <SectionTitle>Returns</SectionTitle>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Type</th>
            {desc && <th>Description</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <CodeChip variant="type">{typeLabel}</CodeChip>
            </td>
            {desc && <td>{desc}</td>}
          </tr>
        </tbody>
      </Table>
      {hasProps && (
        <div>
          <SectionTitle level="subsection">Properties of return object</SectionTitle>
          <ParamsTable properties={props} definitions={returns.definitions} />
        </div>
      )}
    </div>
  );
}

function ErrorsTab({ errors }: { errors: Record<string, string> }) {
  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>Error code</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(errors).map(([code, message]) => (
          <tr key={code}>
            <td>{code}</td>
            <td>{message}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Documentation pane for a method: input, output and error codes. */
export function MethodDescription({ service }: { service: SmdService }) {
  return (
    <div className="sb-method-description">
      {service.description && <p className="sb-summary">{service.description}</p>}
      <Tabs defaultActiveKey="input" id="method-description-tabs" className="mb-3">
        <Tab eventKey="input" title="Input">
          <InputTab service={service} />
        </Tab>
        <Tab eventKey="output" title="Output">
          <OutputTab returns={service.returns} />
        </Tab>
        {service.errors && (
          <Tab eventKey="errors" title="Error codes">
            <ErrorsTab errors={service.errors} />
          </Tab>
        )}
      </Tabs>
    </div>
  );
}
