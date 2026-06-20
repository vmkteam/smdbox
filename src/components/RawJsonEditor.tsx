import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, Button } from 'react-bootstrap';

import { getParamsTemplate, type JsonSchema } from '../lib/smdToJsonSchema';
import type { JsonRpcParams } from '../lib/rpc';
import { CodeEditor } from './CodeEditor';

interface RawJsonEditorProps {
  schema: JsonSchema;
  method: string;
  formData: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
  onSubmit: (fullRequest: object) => void;
  /** Extra actions rendered inline next to the submit button. */
  actions?: React.ReactNode;
}

/** Raw JSON-RPC request editor with lightweight JSON syntax highlighting. */
export function RawJsonEditor({ schema, method, formData, onChange, onSubmit, actions }: RawJsonEditorProps) {
  const [value, setValue] = useState(() =>
    JSON.stringify(getParamsTemplate(method, schema, formData), null, 2),
  );
  const [valid, setValid] = useState(true);

  // Persist edited params back to the shared formData on unmount (tab switch),
  // so Form <-> Raw stay in sync.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(
    () => () => {
      try {
        const parsed = JSON.parse(valueRef.current) as { params?: JsonRpcParams };
        if (parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params)) {
          onChange(parsed.params as Record<string, unknown>);
        }
      } catch {
        // invalid JSON on exit — keep the last good formData
      }
    },
    [onChange],
  );

  const tryParse = (str: string): object | null => {
    try {
      const parsed = JSON.parse(str) as object;
      setValid(true);
      return parsed;
    } catch {
      setValid(false);
      return null;
    }
  };

  const handleChange = (next: string) => {
    setValue(next);
    tryParse(next);
  };

  const submit = () => {
    const parsed = tryParse(valueRef.current);
    if (!parsed) return;
    const params = (parsed as { params?: JsonRpcParams }).params;
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      onChange(params as Record<string, unknown>);
    }
    onSubmit(parsed);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <form className="sb-raw-json-editor" onSubmit={handleSubmit}>
      <CodeEditor
        value={value}
        onChange={handleChange}
        onSubmit={submit}
        invalid={!valid}
        ariaLabel="Raw JSON-RPC request"
      />
      {!valid && (
        <Alert variant="danger" className="mt-2 py-1">
          Invalid JSON
        </Alert>
      )}
      <div className="sb-actions">
        <Button type="submit" variant="success" disabled={!valid}>
          Try
        </Button>
        {actions}
      </div>
    </form>
  );
}
