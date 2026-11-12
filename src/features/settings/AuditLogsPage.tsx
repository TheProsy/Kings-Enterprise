import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/Badge';
import { auditService } from '@/services';
import { formatDateTime } from '@/lib/formatters';
import { ROUTES } from '@/constants';
import type { AuditLog } from '@/types';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    auditService
      .list()
      .then((data) => {
        if (active) setLogs(data);
      })
      .catch((err) => {
        console.error(err);
        if (active) setError('Could not load audit logs.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log: AuditLog) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Operator UID',
      render: (log: AuditLog) => (
        <span className="text-xs font-mono font-semibold text-text-primary truncate max-w-[120px] block">
          {log.userId}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Event Action',
      render: (log: AuditLog) => (
        <Badge variant="info">
          {log.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Entity Scope',
      render: (log: AuditLog) => (
        <span className="text-xs font-medium text-text-primary uppercase">{log.entityType}</span>
      ),
    },
    {
      key: 'details',
      header: 'Audit Context',
      render: (log: AuditLog) => (
        <span className="text-xs text-text-muted font-mono truncate max-w-xs block">
          {log.details ? JSON.stringify(log.details) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable chronological record of sensitive operations, edits, and staff logins."
        breadcrumbs={[
          { label: 'Settings', href: ROUTES.APP_SETTINGS },
          { label: 'Audit Logs' },
        ]}
      />

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        searchPlaceholder="Search audit events..."
        emptyTitle="No audit logs recorded"
        emptyMessage={error || 'Security events will appear here as administrative actions occur.'}
        mobileCardRender={(log) => (
          <div className="space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="info">{log.action}</Badge>
              <span className="text-text-muted">{formatDateTime(log.createdAt)}</span>
            </div>
            <p className="truncate font-semibold text-text-primary">
              Scope: {log.entityType} ({log.entityId || 'general'})
            </p>
            <p className="truncate font-mono text-2xs text-text-muted">
              User: {log.userId}
            </p>
          </div>
        )}
      />
    </div>
  );
}
