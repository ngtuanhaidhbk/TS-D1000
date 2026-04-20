import { useEffect, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { OperationMode } from '../shared/types/system-config';
import { statusClassName } from './system-config-shared';

export function ModeConfigPage() {
  const { token, user } = useAuth();
  const [mode, setMode] = useState<OperationMode['mode']>('MANUAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    setLoading(true);
    void systemConfigApi
      .getMode(token)
      .then((response) => {
        setMode(response.mode);
      })
      .catch((apiError: unknown) => {
        setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load operation mode');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function handleSave() {
    if (!token) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await systemConfigApi.updateMode(mode, token);
      setMode(response.mode);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to update operation mode');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="card">Loading operation mode...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h2>Operation Mode</h2>
          <p className="subtle-text">Choose how runtime should react to speaking events and camera triggers.</p>
        </div>
        <span className={statusClassName(mode)}>{mode}</span>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card mode-card">
        <label className="mode-option">
          <input checked={mode === 'MANUAL'} disabled={user?.role !== 'ADMIN'} onChange={() => setMode('MANUAL')} type="radio" />
          <div>
            <strong>MANUAL</strong>
            <p className="subtle-text">Operators manually control speaking flow and related actions.</p>
          </div>
        </label>
        <label className="mode-option">
          <input checked={mode === 'AUTOMATIC'} disabled={user?.role !== 'ADMIN'} onChange={() => setMode('AUTOMATIC')} type="radio" />
          <div>
            <strong>AUTOMATIC</strong>
            <p className="subtle-text">Runtime automatically reacts to active mappings and current room mode.</p>
          </div>
        </label>

        {user?.role === 'ADMIN' ? (
          <button className="button button-secondary" disabled={saving} onClick={handleSave} type="button">
            {saving ? 'Saving...' : 'Save'}
          </button>
        ) : (
          <p className="subtle-text">Operator can review the current mode but cannot change it.</p>
        )}
      </article>
    </section>
  );
}

