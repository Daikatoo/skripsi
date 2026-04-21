import { formatDate, ACTION_CONFIG, ROLE_CONFIG } from '@/lib/utils'

interface ApprovalLog {
    id: string
    role: string
    action: string
    catatan: string | null
    created_at: string
    profiles: { full_name: string } | null
}

interface ApprovalTimelineProps {
    logs: ApprovalLog[]
}

export function ApprovalTimeline({ logs }: ApprovalTimelineProps) {
    if (logs.length === 0) {
        return (
            <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
                Belum ada riwayat persetujuan.
            </div>
        )
    }

    return (
        <div className="timeline">
            {logs.map((log, index) => {
                const actionConfig = ACTION_CONFIG[log.action] || {
                    label: log.action,
                    color: 'text-gray-600',
                    icon: '📝',
                }
                const roleConfig = ROLE_CONFIG[log.role] || { label: log.role, color: 'text-gray-600' }

                return (
                    <div key={log.id} className={`timeline-item ${index === logs.length - 1 ? 'last' : ''}`}>
                        <div className="timeline-icon">{actionConfig.icon}</div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-name">{log.profiles?.full_name || 'Unknown'}</span>
                                <span className="timeline-role-badge">{roleConfig.label}</span>
                                <span
                                    className="timeline-action"
                                    style={{
                                        color:
                                            log.action === 'approved'
                                                ? '#059669'
                                                : log.action === 'revision'
                                                    ? '#d97706'
                                                    : '#3b82f6',
                                    }}
                                >
                                    {actionConfig.label}
                                </span>
                            </div>
                            {log.catatan && (
                                <div className="timeline-note">
                                    <span>💬</span>
                                    <span>{log.catatan}</span>
                                </div>
                            )}
                            <div className="timeline-date">{formatDate(log.created_at)}</div>
                        </div>
                    </div>
                )
            })}

            <style jsx>{`
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .timeline-item {
          display: flex;
          gap: 16px;
          position: relative;
          padding-bottom: 20px;
        }
        .timeline-item:not(.last)::before {
          content: '';
          position: absolute;
          left: 19px;
          top: 40px;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
        }
        .timeline-icon {
          width: 40px;
          height: 40px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .timeline-content {
          flex: 1;
          padding-top: 8px;
        }
        .timeline-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .timeline-name {
          font-weight: 600;
          font-size: 14px;
          color: #0f172a;
        }
        .timeline-role-badge {
          padding: 2px 8px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .timeline-action {
          font-size: 13px;
          font-weight: 500;
        }
        .timeline-note {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          background: #fffbeb;
          border-left: 3px solid #f59e0b;
          padding: 8px 12px;
          border-radius: 0 6px 6px 0;
          font-size: 13px;
          color: #78350f;
          margin: 6px 0;
        }
        .timeline-date {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }
      `}</style>
        </div>
    )
}
