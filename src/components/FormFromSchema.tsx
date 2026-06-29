import { useRef, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react';
import Form from '@rjsf/react-bootstrap';
import { SchemaExamples } from '@rjsf/core';
import { ariaDescribedByIds, examplesId, getInputProps, getTemplate, getUiOptions } from '@rjsf/utils';
import type {
  ArrayFieldTemplateProps,
  BaseInputTemplateProps,
  FieldTemplateProps,
  IconButtonProps,
  RJSFSchema,
} from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { Button, Form as BsForm } from 'react-bootstrap';
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

/** A hint placeholder derived from a field's JSON Schema type/format (D1). */
function placeholderFor(schema: RJSFSchema): string {
  const examples = schema.examples;
  if (Array.isArray(examples) && examples.length) return `e.g. ${String(examples[0])}`;
  if (schema.default !== undefined && schema.default !== null && typeof schema.default !== 'object') {
    return `e.g. ${String(schema.default)}`;
  }
  switch (schema.format) {
    case 'date-time':
      return 'e.g. 2026-01-01T00:00:00Z';
    case 'date':
      return 'e.g. 2026-01-01';
    case 'email':
      return 'e.g. name@example.com';
    case 'uri':
    case 'url':
      return 'e.g. https://example.com';
    case 'uuid':
      return 'e.g. 00000000-0000-0000-0000-000000000000';
  }
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case 'integer':
    case 'number':
      return 'e.g. 0';
    case 'string':
      return 'text';
    default:
      return '';
  }
}

// Mirrors @rjsf/react-bootstrap's BaseInputTemplate, but fills empty inputs with
// a type-based example placeholder so fields (incl. fresh "Add item" rows) hint
// what they expect instead of sitting blank.
function BaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id, htmlName, placeholder, required, readonly, disabled, type, value,
    onChange, onChangeOverride, onBlur, onFocus, autofocus, options, schema,
    rawErrors = [], children, extraProps,
  } = props;
  const inputProps = { ...extraProps, ...getInputProps(schema, type, options) };
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === '' ? options.emptyValue : e.target.value);
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => onBlur(id, e.target.value);
  const handleFocus = (e: FocusEvent<HTMLInputElement>) => onFocus(id, e.target.value);
  return (
    <>
      <BsForm.Control
        id={id}
        name={htmlName || id}
        placeholder={placeholder || placeholderFor(schema)}
        autoFocus={autofocus}
        required={required}
        disabled={disabled}
        readOnly={readonly}
        className={rawErrors.length > 0 ? 'is-invalid' : ''}
        list={schema.examples ? examplesId(id) : undefined}
        {...inputProps}
        value={value || value === 0 ? value : ''}
        onChange={onChangeOverride || handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        aria-describedby={ariaDescribedByIds(id, !!schema.examples)}
      />
      {children}
      <SchemaExamples id={id} schema={schema} />
    </>
  );
}

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

// Mirrors @rjsf/react-bootstrap's FieldTemplate, but renders the required marker
// as a prominent red asterisk after the label so the Try-it-out form makes clear
// which params must be filled. "Required" follows the SMD `optional` flag
// (required unless `optional` is truthy), matching the documentation table — the
// SMD→JSON Schema conversion carries `optional` rather than a `required` array.
function FieldTemplate(props: FieldTemplateProps) {
  const {
    id, children, displayLabel, rawErrors = [], errors, help, description, rawDescription,
    classNames, style, disabled, label, hidden, onKeyRename, onKeyRenameBlur,
    onRemoveProperty, readonly, required, schema, uiSchema, registry,
  } = props;
  const uiOptions = getUiOptions(uiSchema);
  const WrapIfAdditionalTemplate = getTemplate('WrapIfAdditionalTemplate', registry, uiOptions);
  if (hidden) {
    return <div className="hidden">{children}</div>;
  }
  const isCheckbox = uiOptions.widget === 'checkbox';
  const isRequired = !(schema as { optional?: boolean }).optional;
  return (
    <WrapIfAdditionalTemplate
      classNames={classNames}
      style={style}
      disabled={disabled}
      id={id}
      label={label}
      displayLabel={displayLabel}
      rawDescription={rawDescription}
      onKeyRename={onKeyRename}
      onKeyRenameBlur={onKeyRenameBlur}
      onRemoveProperty={onRemoveProperty}
      readonly={readonly}
      required={required}
      schema={schema}
      uiSchema={uiSchema}
      registry={registry}
    >
      <BsForm.Group>
        {displayLabel && !isCheckbox && (
          <BsForm.Label htmlFor={id} className={rawErrors.length > 0 ? 'text-danger' : ''}>
            {label}
            {isRequired && (
              <span className="sb-required-star" aria-label="required" title="required">
                *
              </span>
            )}
          </BsForm.Label>
        )}
        {children}
        {displayLabel && rawDescription && !isCheckbox && (
          <BsForm.Text className={rawErrors.length > 0 ? 'text-danger' : 'text-muted'}>
            {description}
          </BsForm.Text>
        )}
        {errors}
        {help}
      </BsForm.Group>
    </WrapIfAdditionalTemplate>
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
        templates={{ ButtonTemplates: buttonTemplates, ArrayFieldTemplate, BaseInputTemplate, FieldTemplate }}
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
