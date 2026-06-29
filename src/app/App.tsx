import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  ButtonGroup,
  Container,
  Dropdown,
  Modal,
  Navbar,
  Spinner,
} from 'react-bootstrap';
import {
  ArrowClockwise,
  Bookmarks,
  ClockHistory,
  Gear,
  HddStack,
  MoonStars,
  Pencil,
  QuestionCircle,
  SunFill,
  Trash,
  Upload,
  XLg,
} from 'react-bootstrap-icons';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { History } from '../components/History';
import { MethodViewer } from '../components/MethodViewer';
import { PaneResizer } from '../components/PaneResizer';
import { Project } from '../components/Project';
import { Saved } from '../components/Saved';
import { Sidebar } from '../components/Sidebar';
import { usePaneWidth } from '../hooks/usePaneWidth';
import { refreshSmd, useSmd } from '../data/queries';
import { selectNavbarColor, useStore } from '../store/store';
import { useMethodHash } from './useMethodHash';

function Workspace() {
  const project = useStore((s) => s.project);
  const clearProject = useStore((s) => s.clearProject);
  const theme = useStore((s) => s.prefs.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  // Active env color wins, so switching envs recolors the navbar; else the global pref.
  const navbarColor = useStore(selectNavbarColor);
  const environments = useStore((s) => s.environments);
  const activeEnvironmentId = useStore((s) => s.activeEnvironmentId);
  const saveEnvironment = useStore((s) => s.saveEnvironment);
  const applyEnvironment = useStore((s) => s.applyEnvironment);
  const renameEnvironment = useStore((s) => s.renameEnvironment);
  const deleteEnvironment = useStore((s) => s.deleteEnvironment);
  const importConfig = useStore((s) => s.importConfig);
  const docsUrl = useStore((s) => s.docsUrl);

  const saveCurrentEnv = () => {
    const name = window.prompt('Environment name:');
    if (name) saveEnvironment(name);
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const loadConfigFile = async (file: File) => {
    try {
      const cfg = JSON.parse(await file.text()) as Parameters<typeof importConfig>[0];
      if (!cfg.smdUrl) return;
      importConfig(cfg);
    } catch {
      // ignore invalid config file
    }
  };
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Draggable divider between the methods list and the main pane.
  const [sidebarW, setSidebarW, resetSidebarW] = usePaneWidth('sidebar');
  const mainSplitRef = useRef<HTMLDivElement>(null);
  const onSidebarResize = useCallback(
    (w: number) => {
      const total = mainSplitRef.current?.clientWidth ?? 0;
      // Keep the list usable and leave the main pane at least 420px.
      setSidebarW(Math.max(200, Math.min(w, total - 420)));
    },
    [setSidebarW],
  );

  // Scope the Bootstrap theme to the whole document (covers portalled modals).
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  // Override the navbar color (DEV/PROD presets or a custom pick); '' restores the default.
  useEffect(() => {
    const root = document.documentElement;
    if (navbarColor) root.style.setProperty('--sb-navbar-bg', navbarColor);
    else root.style.removeProperty('--sb-navbar-bg');
  }, [navbarColor]);

  const smd = useSmd(project.created ? project.smdUrl : null, project.headers);
  const services = smd.data?.services;

  const isValidMethod = useCallback((name: string) => Boolean(services?.[name]), [services]);
  useMethodHash(Boolean(services), isValidMethod);

  return (
    <div className="sb-app">
      <Navbar variant="dark" expand className="sb-app__navbar">
        <Container fluid>
          <Navbar.Brand>SMD Box</Navbar.Brand>
          <div className="ms-auto sb-app__nav">
            {/* Group 1 — connection */}
            {(project.created || environments.length > 0) && (
              <Dropdown align="end">
                <Dropdown.Toggle size="sm" variant="outline-light" title="Environments">
                  <HddStack className="me-1" />{' '}
                  <span className="sb-nav-label">
                    {environments.find((e) => e.id === activeEnvironmentId)?.name ?? 'Env'}
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {environments.length === 0 && (
                    <Dropdown.ItemText className="text-muted small">
                      No environments
                    </Dropdown.ItemText>
                  )}
                  {environments.map((env) => (
                    <Dropdown.Item
                      key={env.id}
                      active={env.id === activeEnvironmentId}
                      onClick={() => applyEnvironment(env.id)}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <span>{env.name}</span>
                      <span className="d-flex align-items-center gap-2 ms-3">
                        <span
                          role="button"
                          aria-label={`Rename ${env.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = window.prompt('Environment name:', env.name)?.trim();
                            if (name) renameEnvironment(env.id, name);
                          }}
                        >
                          <Pencil />
                        </span>
                        <span
                          role="button"
                          aria-label={`Delete ${env.name}`}
                          className="text-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEnvironment(env.id);
                          }}
                        >
                          <Trash />
                        </span>
                      </span>
                    </Dropdown.Item>
                  ))}
                  {project.created && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={saveCurrentEnv}>Save current as…</Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            )}
            {project.created && (
              <Button size="sm" variant="outline-light" onClick={clearProject} title="Close project">
                <XLg className="me-1" /> <span className="sb-nav-label">Close</span>
              </Button>
            )}

            {project.created && <span className="sb-app__nav-sep" aria-hidden="true" />}

            {/* Group 2 — work */}
            {project.created && (
              <ButtonGroup size="sm">
                <Button variant="outline-light" onClick={() => setShowHistory(true)} title="History">
                  <ClockHistory className="me-1" /> <span className="sb-nav-label">History</span>
                </Button>
                <Button variant="outline-light" onClick={() => setShowSaved(true)} title="Saved requests">
                  <Bookmarks className="me-1" /> <span className="sb-nav-label">Saved</span>
                </Button>
                <Button
                  variant="outline-light"
                  onClick={() => refreshSmd(project.smdUrl)}
                  disabled={smd.isFetching}
                  title="Refresh schema"
                >
                  <ArrowClockwise className="me-1" /> <span className="sb-nav-label">Refresh</span>
                </Button>
              </ButtonGroup>
            )}

            {project.created && <span className="sb-app__nav-sep" aria-hidden="true" />}

            {/* Group 3 — settings */}
            {project.created && (
              <Button size="sm" variant="outline-light" onClick={() => setShowSettings(true)} title="Project settings">
                <Gear className="me-1" /> <span className="sb-nav-label">Settings</span>
              </Button>
            )}
            {/* Import is for onboarding only; in the working mode use Settings. */}
            {!project.created && (
              <>
                <Button
                  size="sm"
                  variant="outline-light"
                  onClick={() => fileRef.current?.click()}
                  title="Import config"
                >
                  <Upload className="me-1" /> <span className="sb-nav-label">Import</span>
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void loadConfigFile(f);
                    e.target.value = '';
                  }}
                />
              </>
            )}
            {docsUrl && (
              <Button
                size="sm"
                variant="outline-light"
                href={docsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Knowledge base"
                title="Knowledge base"
              >
                <QuestionCircle />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline-light"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title="Toggle dark mode"
            >
              {theme === 'dark' ? <SunFill /> : <MoonStars />}
            </Button>
          </div>
        </Container>
      </Navbar>

      {!project.created ? (
        <Container className="sb-app__setup">
          <Project />
        </Container>
      ) : (
        <Container fluid className="sb-app__main">
          {smd.isLoading && (
            <div className="sb-app__loading">
              <Spinner animation="border" /> Loading SMD schema…
            </div>
          )}
          {smd.isError && (
            <Alert variant="danger">
              Failed to load SMD schema. <Alert.Link onClick={() => refreshSmd(project.smdUrl)}>Retry</Alert.Link>
            </Alert>
          )}
          {services && (
            <div
              className="sb-split sb-split--app"
              ref={mainSplitRef}
              style={sidebarW != null ? ({ '--sb-sidebar-w': `${sidebarW}px` } as React.CSSProperties) : undefined}
            >
              <div className="sb-split__pane sb-split__pane--sidebar sb-app__column">
                <Sidebar services={services} />
              </div>
              <PaneResizer label="Resize methods list" onResize={onSidebarResize} onReset={resetSidebarW} />
              <div className="sb-split__pane sb-split__pane--main sb-app__column">
                <MethodViewer services={services} />
              </div>
            </div>
          )}

          <Modal show={showSettings} onHide={() => setShowSettings(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Project settings</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Project mode="settings" onClose={() => setShowSettings(false)} />
            </Modal.Body>
          </Modal>

          <Modal show={showHistory} onHide={() => setShowHistory(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Request history</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <History onClose={() => setShowHistory(false)} />
            </Modal.Body>
          </Modal>

          <Modal show={showSaved} onHide={() => setShowSaved(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Saved</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Saved onClose={() => setShowSaved(false)} />
            </Modal.Body>
          </Modal>
        </Container>
      )}
    </div>
  );
}

/** Root component. */
export function App() {
  return (
    <ErrorBoundary>
      <Workspace />
    </ErrorBoundary>
  );
}
