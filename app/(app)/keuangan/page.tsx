import ReviewListPage from '@/components/ReviewListPage'

export default function KeuanganPage() {
    return (
        <ReviewListPage
            role="keuangan"
            pendingStatus="pending_keuangan"
            title="💼 Review Anggaran – Keuangan"
            description="Tinjau anggaran yang telah disetujui oleh Kepala Divisi dan berikan keputusan"
        />
    )
}
