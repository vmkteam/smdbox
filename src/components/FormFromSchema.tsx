import { useRef, type KeyboardEvent } from 'react';
import Form from '@rjsf/react-bootstrap';
import { getTemplate, getUiOptions } from '@rjsf/utils';
import type { ArrayFieldTemplateProps, IconButtonProps, RJSFSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { Button } from 'react-bootstrap';
import { ArrowDown, ArrowUp, PlusLg, Trash } from 'react-bootstrap-icons';

import type { JsonSchema } from '../lib/smdToJsonSchema';

// SMD-derived schemas carry non-standard keywords (e.g. `optional`); disable
// AJV strict mode so they are ignored rather than throwing.
const validator = customizeValidator({ ajvOptionsOverrides: { strict: false } });

// Replace the rjsf-bootstrap default buttons (large solid-blue squares) with
// compact, on-brand outline icon buttons matching the rest of the app.
function AddButton({ onClick, disabled }: IconButtonProps) {
  return (
    <Button size="sm" variant="outline-secondary" onClick={onClick} disabled={disabled}>
      <PlusLg className="me-1" /> Add item
    </Button>
  );
}

function iconButton(Icon: typeof Trash, label: string, variant: string) {
  return function RjsfIconButton({ onClick, disabled }: IconButtonProps) {
    return (
      <Button
        size="sm"
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
      >
        <Icon />
      </Button>
    );
  };
}

const buttonTemplates = {
  AddButton,
  RemoveButton: iconButton(Trash, 'Remove item', 'outline-danger'),
  MoveUpButton: iconButton(ArrowUp, 'Move up', 'outline-secondary'),
  MoveDownButton: iconButton(ArrowDown, 'Move down', 'outline-secondary'),
};

// The default rjsf-bootstrap array layout squeezes the Add button into a narrow
// right column. Render items stacked with a normal-width Add button below.
function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { canAdd, onAddClick, items, disabled, readonly, fieldPathId, title, schema, uiSchema, required, registry } =
    props;
  const uiOptions = getUiOptions(uiSchema);
  const TitleTemplate = getTemplate('ArrayFieldTitleTemplate', registry, uiOptions);
  return (
    <div className="sb-array-field">
      <TitleTemplate
        fieldPathId={fieldPathId}
        title={uiOptions.title ?? title}
        required={required}
        schema={schema}
        uiSchema={uiSchema}
        registry={registry}
      />
      {items}
      {canAdd && (
        <div className="sb-array-field__add">
          <AddButton onClick={onAddClick} disabled={disabled || readonly} registry={registry} uiSchema={uiSchema} />
        </div>
      )}
    </div>
  );
}

interface FormFromSchemaProps {
  schema: JsonSchema;
  formData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  onSubmit: (data: Record<string, unknown>) => void;
  /** Extra actions rendered inline next to the submit button. */
  actions?: React.ReactNode;
}

/** Auto-generated parameter form built from a JSON Schema. */
export function FormFromSchema({ schema, formData, onChange, onSubmit, actions }: FormFromSchemaProps) {
  // The method description is already shown in the documentation pane; drop it
  // here so the form doesn't repeat it.
  const formSchema: JsonSchema = { ...schema };
  delete formSchema.description;

  const wrapRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      wrapRef.current?.querySelector('form')?.requestSubmit();
    }
  };

  return (
    <div className="sb-form-from-schema" ref={wrapRef} onKeyDown={onKeyDown}>
      <Form
        schema={formSchema as RJSFSchema}
        formData={formData}
        validator={validator}
        templates={{ ButtonTemplates: buttonTemplates, ArrayFieldTemplate }}
        onChange={(e) => onChange(e.formData as Record<string, unknown>)}
        onSubmit={(e) => onSubmit(e.formData as Record<string, unknown>)}
        onError={(errors) => console.error(errors)}
      >
        <div className="sb-actions">
          <Button type="submit" variant="success">
            Try
          </Button>
          {actions}
        </div>
      </Form>
    </div>
  );
}
