import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  ButtonGroup,
  Col,
  Container,
  Dropdown,
  Modal,
  Navbar,
  Row,
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
import { Project } from '../components/Project';
import { Saved } from '../components/Saved';
import { Sidebar } from '../components/Sidebar';
import { refreshSmd, useSmd } from '../data/queries';
import { useStore } from '../store/store';
import { useMethodHash } from './useMethodHash';

function Workspace() {
  const project = useStore((s) => s.project);
  const clearProject = useStore((s) => s.clearProject);
  const theme = useStore((s) => s.prefs.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
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

  // Scope the Bootstrap theme to the whole document (covers portalled modals).
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

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
                <Dropdown.Toggle size="sm" variant="outline-light">
                  <HddStack className="me-1" />{' '}
                  {environments.find((e) => e.id === activeEnvironmentId)?.name ?? 'Env'}
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
              <Button size="sm" variant="outline-light" onClick={clearProject}>
                <XLg className="me-1" /> Close
              </Button>
            )}

            {project.created && <span className="sb-app__nav-sep" aria-hidden="true" />}

            {/* Group 2 — work */}
            {project.created && (
              <ButtonGroup size="sm">
                <Button variant="outline-light" onClick={() => setShowHistory(true)}>
                  <ClockHistory className="me-1" /> History
                </Button>
                <Button variant="outline-light" onClick={() => setShowSaved(true)}>
                  <Bookmarks className="me-1" /> Saved
                </Button>
                <Button
                  variant="outline-light"
                  onClick={() => refreshSmd(project.smdUrl)}
                  disabled={smd.isFetching}
                >
                  <ArrowClockwise className="me-1" /> Refresh
                </Button>
              </ButtonGroup>
            )}

            {project.created && <span className="sb-app__nav-sep" aria-hidden="true" />}

            {/* Group 3 — settings */}
            {project.created && (
              <Button size="sm" variant="outline-light" onClick={() => setShowSettings(true)}>
                <Gear className="me-1" /> Settings
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
                  <Upload className="me-1" /> Import
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
            <Row>
              <Col md={3} className="sb-app__column">
                <Sidebar services={services} />
              </Col>
              <Col md={9} className="sb-app__column">
                <MethodViewer services={services} />
              </Col>
            </Row>
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

          <Modal show={showSaved} onHide={() => setShowSaved(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Saved requests</Modal.Title>
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
