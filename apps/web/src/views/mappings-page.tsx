import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { Camera, CameraPreset, Mapping, TsdConfig, TsdUnit } from '../shared/types/system-config';
import { statusClassName } from './system-config-shared';

type MappingFormState = {
  id: string | null;
  unitId: string;
  cameraId: string;
  presetId: string;
  isActive: boolean;
};

const defaultMappingFormState: MappingFormState = {
  id: null,
  unitId: '',
  cameraId: '',
  presetId: '',
  isActive: true,
};

export function MappingsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [units, setUnits] = useState<TsdUnit[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [availablePresets, setAvailablePresets] = useState<CameraPreset[]>([]);
  const [form, setForm] = useState<MappingFormState>(defaultMappingFormState);
  const [search, setSearch] = useState('');
  const [cameraFilter, setCameraFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === form.cameraId) ?? null,
    [cameras, form.cameraId],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadData();
  }, [token, search, cameraFilter, activeFilter, deviceTypeFilter]);

  useEffect(() => {
    if (!token || !form.cameraId) {
      setAvailablePresets([]);
      return;
    }
    void systemConfigApi
      .listPresets(form.cameraId, token)
      .then((response) => {
        setAvailablePresets(response.items);
      })
      .catch((apiError: unknown) => {
        setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load presets');
      });
  }, [token, form.cameraId]);

  async function loadData() {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [mappingResponse, cameraResponse] = await Promise.all([
        systemConfigApi.listMappings(token, buildQuery(search, cameraFilter, activeFilter, deviceTypeFilter)),
        systemConfigApi.listCameras(token),
      ]);

      setMappings(mappingResponse.items);
      setCameras(cameraResponse.items);

      let config: TsdConfig | null = null;
      try {
        config = await systemConfigApi.getTsdConfig(token);
      } catch (apiError) {
        if (!(apiError instanceof ApiClientError) || apiError.code !== 'CONFIG_NOT_FOUND') {
          throw apiError;
        }
      }

      if (config) {
        const unitResponse = await systemConfigApi.listUnits(config.id, token);
        setUnits(unitResponse.items);
      } else {
        setUnits([]);
      }
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load mappings');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(mapping: Mapping) {
    setForm({
      id: mapping.id,
      unitId: mapping.unit.id,
      cameraId: mapping.camera.id,
      presetId: mapping.preset.id,
      isActive: mapping.isActive,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        await systemConfigApi.updateMapping(
          form.id,
          {
            cameraId: form.cameraId,
            presetId: form.presetId,
            isActive: form.isActive,
          },
          token,
        );
      } else {
        await systemConfigApi.createMapping(
          {
            unitId: form.unitId,
            cameraId: form.cameraId,
            presetId: form.presetId,
          },
          token,
        );
      }
      setForm(defaultMappingFormState);
      await loadData();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to save mapping');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="card">Loading mappings...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h2>Mic-Camera Mappings</h2>
          <p className="subtle-text">Bind each synced unit to one active camera preset used by runtime.</p>
        </div>
        {isAdmin ? (
          <button className="button button-secondary" onClick={() => setForm(defaultMappingFormState)} type="button">
            Create Mapping
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
            <span>Camera</span>
            <select onChange={(event) => setCameraFilter(event.target.value)} value={cameraFilter}>
              <option value="">All</option>
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-inline">
            <span>Active</span>
            <select onChange={(event) => setActiveFilter(event.target.value)} value={activeFilter}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <label className="field field-inline">
            <span>Device Type</span>
            <select onChange={(event) => setDeviceTypeFilter(event.target.value)} value={deviceTypeFilter}>
              <option value="">All</option>
              <option value="CHAIRMAN">CHAIRMAN</option>
              <option value="DELEGATE">DELEGATE</option>
            </select>
          </label>
        </div>

        {mappings.length === 0 ? (
          <p className="subtle-text">No mappings configured.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Device Type</th>
                <th>Camera</th>
                <th>Preset</th>
                <th>Active</th>
                {isAdmin ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping) => (
                <tr key={mapping.id}>
                  <td>
                    {mapping.unit.externalUnitId}
                    {mapping.unit.unitName ? ` - ${mapping.unit.unitName}` : ''}
                  </td>
                  <td>{mapping.unit.deviceType}</td>
                  <td>{mapping.camera.name}</td>
                  <td>{mapping.preset.presetCode}</td>
                  <td>
                    <span className={statusClassName(mapping.isActive ? 'ACTIVE' : 'INACTIVE')}>
                      {mapping.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  {isAdmin ? (
                    <td>
                      <button className="button button-secondary button-compact" onClick={() => startEdit(mapping)} type="button">
                        Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      {isAdmin ? (
        <article className="card">
          <h3>{form.id ? 'Update Mapping' : 'Create Mapping'}</h3>
          <form className="form-grid compact-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Unit</span>
              <select
                disabled={Boolean(form.id)}
                onChange={(event) => setForm((value) => ({ ...value, unitId: event.target.value }))}
                value={form.unitId}
              >
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.externalUnitId}
                    {unit.unitName ? ` - ${unit.unitName}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Camera</span>
              <select
                onChange={(event) => setForm((value) => ({ ...value, cameraId: event.target.value, presetId: '' }))}
                value={form.cameraId}
              >
                <option value="">Select camera</option>
                {cameras
                  .filter((camera) => camera.status === 'ACTIVE')
                  .map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Preset</span>
              <select
                aria-label="Preset"
                disabled={!form.cameraId || availablePresets.length === 0}
                onChange={(event) => setForm((value) => ({ ...value, presetId: event.target.value }))}
                value={form.presetId}
              >
                <option value="">Select preset</option>
                {availablePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.presetCode}
                    {preset.presetName ? ` - ${preset.presetName}` : ''}
                  </option>
                ))}
              </select>
              {!form.cameraId ? <small className="field-help">Select a camera first.</small> : null}
              {form.cameraId && availablePresets.length === 0 ? (
                <small className="field-help">No presets available for selected camera.</small>
              ) : null}
            </label>
            {form.id ? (
              <label className="field field-checkbox">
                <input
                  checked={form.isActive}
                  onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))}
                  type="checkbox"
                />
                <span>Active mapping</span>
              </label>
            ) : null}
            {selectedCamera && selectedCamera.status !== 'ACTIVE' ? (
              <div className="error-banner">Selected camera is inactive.</div>
            ) : null}
            <div className="form-actions">
              <button className="button button-secondary" disabled={saving} type="submit">
                {saving ? 'Saving...' : form.id ? 'Update Mapping' : 'Save Mapping'}
              </button>
            </div>
          </form>
        </article>
      ) : null}
    </section>
  );
}

function buildQuery(search: string, cameraId: string, isActive: string, deviceType: string) {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set('search', search.trim());
  }
  if (cameraId) {
    params.set('cameraId', cameraId);
  }
  if (isActive) {
    params.set('isActive', isActive);
  }
  if (deviceType) {
    params.set('deviceType', deviceType);
  }
  return params;
}
