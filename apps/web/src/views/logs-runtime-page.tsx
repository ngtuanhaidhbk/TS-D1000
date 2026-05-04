import { useCallback, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { loggingApi } from '../shared/services/logging-api';
import { LogsTable } from './logging-shared';

export function LogsRuntimePage() {
  const { token } = useAuth();
  const [eventType, setEventType] = useState('');
  const [result, setResult] = useState('');

  const fetch = useCallback(
    async (args: { page: number; pageSize: number; keyword?: string; from?: string; to?: string }) => {
      if (!token) return { items: [], page: 1, pageSize: 50, total: 0 };
      return loggingApi.listRuntime(
        {
          page: args.page,
          pageSize: args.pageSize,
          keyword: args.keyword,
          from: toIso(args.from),
          to: toIso(args.to),
          eventType: eventType || undefined,
          result: result || undefined,
        },
        token,
      );
    },
    [eventType, result, token],
  );

  return (
    <LogsTable
      title="Runtime Logs"
      fetch={fetch}
      extraFilters={
        <>
          <label className="field">
            <span className="field-label">Event Type</span>
            <input className="input" value={eventType} onChange={(e) => setEventType(e.target.value)} />
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

