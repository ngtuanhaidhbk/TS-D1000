import { useCallback, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { loggingApi } from '../shared/services/logging-api';
import { LogsTable } from './logging-shared';

export function LogsCameraPage() {
  const { token } = useAuth();
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');

  const fetch = useCallback(
    async (args: { page: number; pageSize: number; keyword?: string; from?: string; to?: string }) => {
      if (!token) return { items: [], page: 1, pageSize: 50, total: 0 };
      return loggingApi.list(
        {
          logType: 'CAMERA',
          page: args.page,
          pageSize: args.pageSize,
          keyword: args.keyword,
          from: toIso(args.from),
          to: toIso(args.to),
          action: action || undefined,
          result: result || undefined,
        },
        token,
      );
    },
    [action, result, token],
  );

  return (
    <LogsTable
      title="Camera Logs"
      fetch={fetch}
      extraFilters={
        <>
          <label className="field">
            <span className="field-label">Action</span>
            <input className="input" value={action} onChange={(e) => setAction(e.target.value)} placeholder="TRIGGER_PRESET..." />
          </label>
          <label className="field">
            <span className="field-label">Result</span>
            <select className="select" value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">Any</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="SKIPPED">SKIPPED</option>
            </select>
          </label>
        </>
      }
    />
  );
}

function toIso(local: string | undefined) {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

