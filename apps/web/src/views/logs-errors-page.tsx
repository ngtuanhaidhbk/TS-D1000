import { useCallback, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { loggingApi } from '../shared/services/logging-api';
import { LogsTable } from './logging-shared';

export function LogsErrorsPage() {
  const { token } = useAuth();
  const [level, setLevel] = useState('ERROR');

  const fetch = useCallback(
    async (args: { page: number; pageSize: number; keyword?: string; from?: string; to?: string }) => {
      if (!token) return { items: [], page: 1, pageSize: 50, total: 0 };
      return loggingApi.list(
        {
          logType: 'CAMERA', // demo limitation: system errors are represented via camera/runtime failures
          level: level || undefined,
          page: args.page,
          pageSize: args.pageSize,
          keyword: args.keyword,
          from: toIso(args.from),
          to: toIso(args.to),
          result: 'FAILED',
        },
        token,
      );
    },
    [level, token],
  );

  return (
    <LogsTable
      title="System Errors"
      fetch={fetch}
      extraFilters={
        <label className="field">
          <span className="field-label">Level</span>
          <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </label>
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

