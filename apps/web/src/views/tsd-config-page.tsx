import { useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { TsdConfig, TsdUnit } from '../shared/types/system-config';
import { formatDateTime, statusClassName } from './system-config-shared';

type TsdFormState = {
  baseUrl: string;
  username: string;
  password: string;
  sseEndpoint: string;
};

const defaultFormState: TsdFormState = {
  baseUrl: '',
  username: '',
  password: '',
  sseEndpoint: '/api/event',
};

export function TsdConfigPage() {
  const { token, user } = useAuth();
  const [config, setConfig] = useState<TsdConfig | null>(null);
  const [units, setUnits] = useState<TsdUnit[]>([]);
  const [form, setForm] = useState<TsdFormState>(defaultFormState);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadConfig();
  }, [token]);

  async function loadConfig() {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await systemConfigApi.getTsdConfig(token);
      setConfig(response);
      setForm({
        baseUrl: response.baseUrl,
        username: response.username ?? '',
        password: '',
        sseEndpoint: response.sseEndpoint,
      });
      await loadUnits(response.id);
    } catch (apiError) {
      if (apiError instanceof ApiClientError && apiError.code === 'CONFIG_NOT_FOUND') {
        setConfig(null);
        setUnits([]);
        setForm(defaultFormState);
      } else {
        setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load TS-D1000 configuration');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadUnits(configId: string) {
    if (!token) {
      return;
    }
    const response = await systemConfigApi.listUnits(configId, token);
    setUnits(response.items);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        baseUrl: form.baseUrl.trim(),
        username: form.username.trim() || undefined,
        password: form.password.trim() || undefined,
        sseEndpoint: form.sseEndpoint.trim() || undefined,
      };
      const response = config
        ? await systemConfigApi.updateTsdConfig(config.id, payload, token)
        : await systemConfigApi.createTsdConfig(payload, token);
      setConfig(response);
      setForm({
        baseUrl: response.baseUrl,
        username: response.username ?? '',
        password: '',
        sseEndpoint: response.sseEndpoint,
      });
      setEditing(false);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to save TS-D1000 configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!token || !config) {
      return;
    }
    setTesting(true);
    setError(null);
    try {
      await systemConfigApi.testTsdConfig(config.id, token);
      await loadConfig();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleSyncUnits() {
    if (!token || !config) {
      return;
    }
    setSyncing(true);
    setError(null);
    try {
      const response = await systemConfigApi.syncUnits(config.id, token);
      setSyncSummary(
        `Synced ${response.synced} units. Created ${response.created}, updated ${response.updated}, skipped ${response.skipped}.`,
      );
      await loadUnits(config.id);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to sync TS-D1000 units');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <section className="card">Loading TS-D1000 configuration...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h2>TS-D1000</h2>
          <p className="subtle-text">Configure the controller endpoint, then test the connection and sync active units.</p>
        </div>
        {user?.role === 'ADMIN' ? (
          <div className="header-actions-wrap">
            <button className="button button-secondary" onClick={() => setEditing((value) => !value)} type="button">
              {editing ? 'Cancel' : config ? 'Edit Configuration' : 'Create Configuration'}
            </button>
            <button className="button button-secondary" disabled={!config || testing} onClick={handleTestConnection} type="button">
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button className="button button-secondary" disabled={!config || syncing} onClick={handleSyncUnits} type="button">
              {syncing ? 'Syncing...' : 'Sync Units'}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {syncSummary ? <div className="success-banner">{syncSummary}</div> : null}

      <article className="card info-card">
        <div className="card-heading">
          <h3>Connection</h3>
          {config?.lastTestResult ? (
            <span className={statusClassName(config.lastTestResult)}>{config.lastTestResult}</span>
          ) : null}
        </div>
        {config ? (
          <dl className="detail-grid">
            <div>
              <dt>Base URL</dt>
              <dd>{config.baseUrl}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{config.username ?? 'Not set'}</dd>
            </div>
            <div>
              <dt>SSE endpoint</dt>
              <dd>{config.sseEndpoint}</dd>
            </div>
            <div>
              <dt>Last test</dt>
              <dd>{formatDateTime(config.lastTestAt)}</dd>
            </div>
          </dl>
        ) : (
          <p className="subtle-text">No TS-D1000 configuration yet.</p>
        )}
      </article>

      {editing && user?.role === 'ADMIN' ? (
        <article className="card">
          <h3>{config ? 'Edit TS-D1000 Configuration' : 'Create TS-D1000 Configuration'}</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Base URL</span>
              <input
                name="baseUrl"
                onChange={(event) => setForm((value) => ({ ...value, baseUrl: event.target.value }))}
                value={form.baseUrl}
              />
            </label>
            <label className="field">
              <span>Username</span>
              <input
                name="username"
                onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))}
                value={form.username}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                type="password"
                value={form.password}
              />
            </label>
            <label className="field">
              <span>SSE Endpoint</span>
              <input
                name="sseEndpoint"
                onChange={(event) => setForm((value) => ({ ...value, sseEndpoint: event.target.value }))}
                value={form.sseEndpoint}
              />
            </label>
            <div className="form-actions">
              <button className="button button-secondary" disabled={saving} type="submit">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="card">
        <div className="card-heading">
          <h3>Synced Units</h3>
          <span className="subtle-text">{units.length} unit(s)</span>
        </div>
        {units.length === 0 ? (
          <p className="subtle-text">No units synced yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>External Unit ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Runtime State</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td>{unit.externalUnitId}</td>
                  <td>{unit.unitName ?? 'Unnamed'}</td>
                  <td>{unit.deviceType}</td>
                  <td>{unit.runtimeState}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
