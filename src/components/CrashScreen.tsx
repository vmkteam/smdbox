import { Button } from 'react-bootstrap';

import { clearState } from '../lib/persist';
import { useStore } from '../store/store';

/** Fallback UI shown by ErrorBoundary; offers a full cache reset. */
export function CrashScreen() {
  const clearProject = useStore((s) => s.clearProject);

  const onReset = async () => {
    await clearState().catch(() => {});
    clearProject();
    window.location.reload();
  };

  return (
    <div className="sb-crash">
      <h1>Oops! Something crashed</h1>
      <p>Fortunately, you have this magic button.</p>
      <Button size="lg" variant="success" onClick={onReset}>
        Clear project cache and restart
      </Button>
    </div>
  );
}
