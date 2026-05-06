import { STATUS_CONFIG, type AnggaranStatus } from '@/lib/utils'

interface StatusBadgeProps {
    status: AnggaranStatus
    size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    const fontSize = size === 'sm' ? '11px' : '12px'
    const padding = size === 'sm' ? '2px 8px' : '4px 10px'

    return (
        <span
            className="badge"
            style={{
                fontSize,
                padding,
                color: config.color.replace('text-', '').replace('-700', '').replace('-600', ''),
                backgroundColor: config.bg.replace('bg-', '').replace('-100', ''),
            }}
        >
            <StatusIndicator status={status} />
            {config.label}
        </span>
    )
}

function StatusIndicator({ status }: { status: AnggaranStatus }) {
    const colors: Record<AnggaranStatus, string> = {
        draft: '#6b7280',
        pending_kepala: '#1d4ed8',
        revision_kepala: '#d97706',
        pending_keuangan: '#7e22ce',
        revision_keuangan: '#d97706',
        pending_rektorat: '#3730a3',
        revision_rektorat: '#d97706',
        approved: '#059669',
        rejected: '#dc2626',
    }

    const bgColors: Record<AnggaranStatus, string> = {
        draft: '#f3f4f6',
        pending_kepala: '#dbeafe',
        revision_kepala: '#fef3c7',
        pending_keuangan: '#f3e8ff',
        revision_keuangan: '#fef3c7',
        pending_rektorat: '#e0e7ff',
        revision_rektorat: '#fef3c7',
        approved: '#d1fae5',
        rejected: '#fee2e2',
    }

    return (
        <span
            style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: colors[status],
                marginRight: '6px',
                flexShrink: 0,
            }}
        />
    )
}

// Direct styled badge for convenience
export function StatusBadgeStyled({ status }: { status: AnggaranStatus }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft

    const colorMap: Record<string, { text: string; bg: string; dot: string }> = {
        draft: { text: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
        pending_kepala: { text: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
        revision_kepala: { text: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
        pending_keuangan: { text: '#7e22ce', bg: '#f3e8ff', dot: '#a855f7' },
        revision_keuangan: { text: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
        pending_rektorat: { text: '#3730a3', bg: '#e0e7ff', dot: '#6366f1' },
        revision_rektorat: { text: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
        approved: { text: '#059669', bg: '#d1fae5', dot: '#10b981' },
        rejected: { text: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
    }

    const colors = colorMap[status] || colorMap.draft

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                color: colors.text,
                backgroundColor: colors.bg,
                whiteSpace: 'nowrap',
                gap: '6px',
            }}
        >
            <span
                style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: colors.dot,
                    flexShrink: 0,
                }}
            />
            {config.label}
        </span>
    )
}
