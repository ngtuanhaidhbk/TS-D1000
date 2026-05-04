import { useCallback, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { loggingApi } from '../shared/services/logging-api';
import { LogsTable } from './logging-shared';

export function LogsAuditPage() {
  const { token } = useAuth();
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [actorUserId, setActorUserId] = useState('');

  const fetch = useCallback(
    async (args: { page: number; pageSize: number; keyword?: string; from?: string; to?: string }) => {
      if (!token) return { items: [], page: 1, pageSize: 50, total: 0 };
      return loggingApi.listAudit(
        {
          page: args.page,
          pageSize: args.pageSize,
          keyword: args.keyword,
          from: toIso(args.from),
          to: toIso(args.to),
          action: action || undefined,
          actorUserId: actorUserId || undefined,
          result: (result as any) || undefined,
        },
        token,
      );
    },
    [action, actorUserId, result, token],
  );

  return (
    <LogsTable
      title="Audit Logs"
      fetch={fetch}
      extraFilters={
        <>
          <label className="field">
            <span className="field-label">Actor User ID</span>
            <input className="input" value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Action</span>
            <input className="input" value={action} onChange={(e) => setAction(e.target.value)} placeholder="UPDATE_CAMERA..." />
          </label>
          <label className="field">
            <span className="field-label">Result</span>
            <select className="select" value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">Any</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
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

