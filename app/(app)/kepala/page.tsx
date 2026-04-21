import ReviewListPage from '@/components/ReviewListPage'

export default function KepalaPage() {
    return (
        <ReviewListPage
            role="kepala_divisi"
            pendingStatus="pending_kepala"
            title="🔍 Review Anggaran Divisi"
            description="Tinjau dan berikan keputusan untuk pengajuan anggaran dari anggota divisi Anda"
        />
    )
}
