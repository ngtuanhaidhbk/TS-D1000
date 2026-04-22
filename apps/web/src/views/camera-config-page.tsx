import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { Camera, CameraPreset } from '../shared/types/system-config';
import { formatDateTime, statusClassName } from './system-config-shared';

type CameraFormState = {
  name: string;
  protocol: 'ONVIF' | 'VISCA' | 'AXIS_VAPIX' | 'VENDOR_API';
  ipAddress: string;
  port: string;
  username: string;
  password: string;
  rtspUrl: string;
  vendor: string;
  model: string;
};

const defaultCameraFormState: CameraFormState = {
  name: '',
  protocol: 'ONVIF',
  ipAddress: '',
  port: '',
  username: '',
  password: '',
  rtspUrl: '',
  vendor: '',
  model: '',
};

type PresetFormState = {
  id: string | null;
  presetCode: string;
  presetName: string;
};

const defaultPresetFormState: PresetFormState = {
  id: null,
  presetCode: '',
  presetName: '',
};

export function CameraConfigPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [presets, setPresets] = useState<CameraPreset[]>([]);
  const [form, setForm] = useState<CameraFormState>(defaultCameraFormState);
  const [presetForm, setPresetForm] = useState<PresetFormState>(defaultPresetFormState);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [testResultFilter, setTestResultFilter] = useState('');
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId) ?? null,
    [cameras, selectedCameraId],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadCameras();
  }, [token, search, statusFilter, protocolFilter, testResultFilter]);

  useEffect(() => {
    if (!token || !selectedCameraId) {
      setPresets([]);
      return;
    }
    void loadPresets(selectedCameraId);
  }, [token, selectedCameraId]);

  async function loadCameras() {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      if (protocolFilter) {
        params.set('protocol', protocolFilter);
      }
      if (testResultFilter) {
        params.set('testResult', testResultFilter);
      }
      const response = await systemConfigApi.listCameras(token, params);
      setCameras(response.items);
      setSelectedCameraId((current) => current ?? response.items[0]?.id ?? null);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load cameras');
    } finally {
      setLoading(false);
    }
  }

  async function loadPresets(cameraId: string) {
    if (!token) {
      return;
    }
    try {
      const response = await systemConfigApi.listPresets(cameraId, token);
      setPresets(response.items);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load presets');
    }
  }

  async function deletePreset(presetId: string) {
    if (!token || !selectedCameraId) {
      return;
    }
    const confirmed = window.confirm('Delete this preset? This cannot be undone.');
    if (!confirmed) {
      return;
    }
    setPresetSaving(true);
    setError(null);
    try {
      await systemConfigApi.deletePreset(presetId, token);
      await loadPresets(selectedCameraId);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to delete preset');
    } finally {
      setPresetSaving(false);
    }
  }

  function openCreateForm() {
    setEditingCameraId(null);
    setForm(defaultCameraFormState);
  }

  function openEditForm(camera: Camera) {
    setEditingCameraId(camera.id);
    setForm({
      name: camera.name,
      protocol: camera.protocol,
      ipAddress: camera.ipAddress,
      port: camera.port ? String(camera.port) : '',
      username: '',
      password: '',
      rtspUrl: camera.rtspUrl ?? '',
      vendor: camera.vendor ?? '',
      model: camera.model ?? '',
    });
  }

  async function handleCameraSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        protocol: form.protocol,
        ipAddress: form.ipAddress.trim(),
        port: form.port ? Number(form.port) : undefined,
        username: form.username.trim() || undefined,
        password: form.password.trim() || undefined,
        rtspUrl: form.rtspUrl.trim() || undefined,
        vendor: form.vendor.trim() || undefined,
        model: form.model.trim() || undefined,
      };
      if (editingCameraId) {
        await systemConfigApi.updateCamera(editingCameraId, payload, token);
      } else {
        await systemConfigApi.createCamera(payload, token);
      }
      setForm(defaultCameraFormState);
      setEditingCameraId(null);
      await loadCameras();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to save camera');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestCamera() {
    if (!token || !selectedCamera) {
      return;
    }
    setError(null);
    try {
      await systemConfigApi.testCamera(selectedCamera.id, token);
      await loadCameras();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Camera test failed');
    }
  }

  async function handleDeactivateCamera() {
    if (!token || !selectedCamera) {
      return;
    }
    setError(null);
    try {
      await systemConfigApi.deactivateCamera(selectedCamera.id, 'Deactivated from UI', token);
      await loadCameras();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to deactivate camera');
    }
  }

  async function handleDetectCapabilities() {
    if (!token || !selectedCamera) {
      return;
    }
    setError(null);
    try {
      await systemConfigApi.detectCameraCapabilities(selectedCamera.id, token);
      await loadCameras();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to detect capabilities');
    }
  }

  async function handlePresetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedCamera) {
      return;
    }
    setPresetSaving(true);
    setError(null);
    try {
      const payload = {
        presetCode: presetForm.presetCode.trim(),
        presetName: presetForm.presetName.trim() || undefined,
      };
      if (presetForm.id) {
        await systemConfigApi.updatePreset(presetForm.id, payload, token);
      } else {
        await systemConfigApi.createPreset(selectedCamera.id, payload, token);
      }
      setPresetForm(defaultPresetFormState);
      await loadPresets(selectedCamera.id);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to save preset');
    } finally {
      setPresetSaving(false);
    }
  }

  if (loading) {
    return <section className="card">Loading cameras...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h2>Cameras</h2>
          <p className="subtle-text">Manage PTZ cameras, test connectivity, and configure presets for mapping.</p>
        </div>
        {isAdmin ? (
          <button className="button button-secondary" onClick={openCreateForm} type="button">
            Add Camera
          </button>
        ) : (
          <span className="read-only-tag">Read only</span>
        )}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card">
        <div className="filter-bar">
          <label className="field field-inline">
            <span>Search</span>
            <input onChange={(event) => setSearch(event.target.value)} value={search} />
          </label>
          <label className="field field-inline">
            <span>Status</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
          </label>
          <label className="field field-inline">
            <span>Protocol</span>
            <select onChange={(event) => setProtocolFilter(event.target.value)} value={protocolFilter}>
              <option value="">All</option>
              <option value="ONVIF">ONVIF</option>
              <option value="VISCA">VISCA</option>
              <option value="AXIS_VAPIX">AXIS VAPIX</option>
              <option value="VENDOR_API">Vendor API</option>
            </select>
          </label>
          <label className="field field-inline">
            <span>Test result</span>
            <select onChange={(event) => setTestResultFilter(event.target.value)} value={testResultFilter}>
              <option value="">All</option>
              <option value="UNTESTED">UNTESTED</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="FAILED">FAILED</option>
            </select>
          </label>
        </div>

        {cameras.length === 0 ? (
          <p className="subtle-text">No cameras configured yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Protocol</th>
                <th>IP Address</th>
                <th>Vendor / Model</th>
                <th>Status</th>
                <th>Capabilities</th>
                <th>Last test</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((camera) => (
                <tr
                  key={camera.id}
                  className={selectedCameraId === camera.id ? 'is-selected-row' : undefined}
                  onClick={() => setSelectedCameraId(camera.id)}
                >
                  <td>{camera.name}</td>
                  <td>{camera.protocol}</td>
                  <td>{camera.ipAddress}{camera.port ? `:${camera.port}` : ''}</td>
                  <td>
                    {(camera.vendor || camera.model)
                      ? `${camera.vendor ?? 'Unknown'}${camera.model ? ` / ${camera.model}` : ''}`
                      : 'Not set'}
                  </td>
                  <td>
                    <span className={statusClassName(camera.status)}>{camera.status}</span>
                  </td>
                  <td>
                    {camera.capabilities.ptz ? 'PTZ' : 'No PTZ'} / {camera.capabilities.preset ? 'Preset' : 'No preset'}
                  </td>
                  <td>
                    {camera.lastTestResult ? (
                      <span className={statusClassName(camera.lastTestResult)}>{camera.lastTestResult}</span>
                    ) : (
                      <span className="subtle-text">UNTESTED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <div className="info-grid">
        <article className="card info-card">
          <div className="card-heading">
            <h3>Selected Camera</h3>
            {selectedCamera ? (
              <span className={statusClassName(selectedCamera.status)}>{selectedCamera.status}</span>
            ) : null}
          </div>
          {selectedCamera ? (
            <>
              <dl className="detail-grid">
                <div>
                  <dt>Name</dt>
                  <dd>{selectedCamera.name}</dd>
                </div>
                <div>
                  <dt>Endpoint</dt>
                  <dd>
                    {selectedCamera.ipAddress}
                    {selectedCamera.port ? `:${selectedCamera.port}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Last test</dt>
                  <dd>{formatDateTime(selectedCamera.lastTestAt)}</dd>
                </div>
                <div>
                  <dt>Test result</dt>
                  <dd>
                    {selectedCamera.lastTestResult ? (
                      <span className={statusClassName(selectedCamera.lastTestResult)}>{selectedCamera.lastTestResult}</span>
                    ) : (
                      'UNTESTED'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Stream</dt>
                  <dd>{selectedCamera.capabilities.stream ? 'Available' : 'Not detected'}</dd>
                </div>
                <div>
                  <dt>PTZ</dt>
                  <dd>{selectedCamera.capabilities.ptz ? 'Supported' : 'Unsupported'}</dd>
                </div>
                <div>
                  <dt>Presets</dt>
                  <dd>{selectedCamera.capabilities.preset ? 'Supported' : 'Unsupported'}</dd>
                </div>
                <div>
                  <dt>Manual control</dt>
                  <dd>{selectedCamera.capabilities.manualControl ? 'Supported' : 'Unsupported'}</dd>
                </div>
                <div>
                  <dt>Position query</dt>
                  <dd>{selectedCamera.capabilities.positionQuery ? 'Supported' : 'Unsupported'}</dd>
                </div>
              </dl>
              {isAdmin ? (
                <div className="header-actions-wrap">
                  <button className="button button-secondary" onClick={() => openEditForm(selectedCamera)} type="button">
                    Edit
                  </button>
                  <button className="button button-secondary" onClick={handleTestCamera} type="button">
                    Test Camera
                  </button>
                  <button className="button button-secondary" onClick={handleDetectCapabilities} type="button">
                    Detect Capability
                  </button>
                  <button className="button button-danger" onClick={handleDeactivateCamera} type="button">
                    Deactivate
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="subtle-text">Select a camera to view details.</p>
          )}
        </article>

        <article className="card info-card">
          <div className="card-heading">
            <h3>Presets</h3>
            {selectedCamera ? <span className="subtle-text">{presets.length} preset(s)</span> : null}
          </div>
          {!selectedCamera ? (
            <p className="subtle-text">Select a camera first.</p>
          ) : (
            <>
              {!selectedCamera.capabilities.preset && selectedCamera.lastTestResult === 'SUCCESS' ? (
                <div className="warning-banner">
                  This camera does not support preset control. Preset actions are disabled.
                </div>
              ) : null}
              {presets.length === 0 ? <p className="subtle-text">No presets available for selected camera.</p> : null}
              <ul className="stack-list">
                {presets.map((preset) => (
                  <li key={preset.id} className="list-card">
                    <div className="card-heading">
                      <strong>{preset.presetCode}</strong>
                      {isAdmin ? (
                        <div className="stack-row">
                          <button
                            className="button button-secondary button-compact"
                            onClick={() =>
                              setPresetForm({
                                id: preset.id,
                                presetCode: preset.presetCode,
                                presetName: preset.presetName ?? '',
                              })
                            }
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="button button-danger button-compact"
                            disabled={presetSaving}
                            onClick={() => void deletePreset(preset.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p className="subtle-text">{preset.presetName ?? 'Unnamed preset'}</p>
                  </li>
                ))}
              </ul>

                {isAdmin ? (
                <form
                  className="form-grid compact-form"
                  onSubmit={handlePresetSubmit}
                >
                  <label className="field">
                    <span>Preset Code</span>
                    <input
                      onChange={(event) => setPresetForm((value) => ({ ...value, presetCode: event.target.value }))}
                      disabled={!selectedCamera.capabilities.preset && selectedCamera.lastTestResult === 'SUCCESS'}
                      value={presetForm.presetCode}
                    />
                  </label>
                  <label className="field">
                    <span>Preset Name</span>
                    <input
                      onChange={(event) => setPresetForm((value) => ({ ...value, presetName: event.target.value }))}
                      disabled={!selectedCamera.capabilities.preset && selectedCamera.lastTestResult === 'SUCCESS'}
                      value={presetForm.presetName}
                    />
                  </label>
                  <div className="form-actions">
                    <button
                      className="button button-secondary"
                      disabled={
                        presetSaving || (!selectedCamera.capabilities.preset && selectedCamera.lastTestResult === 'SUCCESS')
                      }
                      type="submit"
                    >
                      {presetSaving ? 'Saving...' : presetForm.id ? 'Update Preset' : 'Add Preset'}
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          )}
        </article>
      </div>

      {isAdmin ? (
        <article className="card">
          <h3>{editingCameraId ? 'Edit Camera' : 'Add Camera'}</h3>
          <form className="form-grid" onSubmit={handleCameraSubmit}>
            <label className="field">
              <span>Name</span>
              <input onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
            </label>
            <label className="field">
              <span>Protocol</span>
              <select
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    protocol: event.target.value as CameraFormState['protocol'],
                  }))
                }
                value={form.protocol}
              >
                <option value="ONVIF">ONVIF</option>
                <option value="VISCA">VISCA</option>
                <option value="AXIS_VAPIX">AXIS VAPIX</option>
                <option value="VENDOR_API">Vendor API</option>
              </select>
            </label>
            <label className="field">
              <span>IP Address</span>
              <input onChange={(event) => setForm((value) => ({ ...value, ipAddress: event.target.value }))} value={form.ipAddress} />
            </label>
            <label className="field">
              <span>Port</span>
              <input onChange={(event) => setForm((value) => ({ ...value, port: event.target.value }))} value={form.port} />
            </label>
            <label className="field">
              <span>Username</span>
              <input onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} value={form.username} />
            </label>
            <label className="field">
              <span>Password</span>
              <input onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} type="password" value={form.password} />
            </label>
            <label className="field">
              <span>RTSP URL</span>
              <input onChange={(event) => setForm((value) => ({ ...value, rtspUrl: event.target.value }))} value={form.rtspUrl} />
            </label>
            <label className="field">
              <span>Vendor</span>
              <input onChange={(event) => setForm((value) => ({ ...value, vendor: event.target.value }))} value={form.vendor} />
            </label>
            <label className="field">
              <span>Model</span>
              <input onChange={(event) => setForm((value) => ({ ...value, model: event.target.value }))} value={form.model} />
            </label>
            <div className="form-actions">
              <button className="button button-secondary" disabled={saving} type="submit">
                {saving ? 'Saving...' : editingCameraId ? 'Update Camera' : 'Save Camera'}
              </button>
            </div>
          </form>
        </article>
      ) : null}
    </section>
  );
}
