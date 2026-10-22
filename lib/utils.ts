// Format currency to Indonesian Rupiah
export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

// Format date to Indonesian locale
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
export function formatBulan(bulan: number, tahun: number): string { return `${BULAN_NAMES[bulan]} ${tahun}` }

// Status
export type PengajuanStatus = 'draft'|'pending_kepala'|'revision_kepala'|'pending_keuangan'|'revision_keuangan'|'pending_rektorat'|'revision_rektorat'|'approved'|'rejected'|'pending_dekan'|'pending_keuangan_awal'|'pending_wr1'|'pending_wr2'|'pending_rektor'|'pending_keuangan_akhir'|'revision_bulanan'
export type AnggaranStatus = PengajuanStatus

export const STATUS_CONFIG: Record<PengajuanStatus, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
    pending_kepala: { label: 'Menunggu Kepala Divisi', color: 'text-blue-700', bg: 'bg-blue-100' },
    revision_kepala: { label: 'Revisi dari Kepala Divisi', color: 'text-orange-700', bg: 'bg-orange-100' },
    pending_keuangan: { label: 'Menunggu Keuangan', color: 'text-purple-700', bg: 'bg-purple-100' },
    revision_keuangan: { label: 'Revisi dari Keuangan', color: 'text-orange-700', bg: 'bg-orange-100' },
    pending_rektorat: { label: 'Menunggu Rektorat', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    revision_rektorat: { label: 'Revisi dari Rektorat', color: 'text-orange-700', bg: 'bg-orange-100' },
    approved: { label: 'Disetujui', color: 'text-green-700', bg: 'bg-green-100' },
    rejected: { label: 'Ditolak', color: 'text-red-700', bg: 'bg-red-100' },
    pending_dekan: { label: 'Menunggu Dekan', color: 'text-blue-700', bg: 'bg-blue-100' },
    pending_keuangan_awal: { label: 'Menunggu Keuangan', color: 'text-purple-700', bg: 'bg-purple-100' },
    pending_wr1: { label: 'Menunggu Wakil Rektor 1', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    pending_wr2: { label: 'Menunggu Wakil Rektor 2', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    pending_rektor: { label: 'Menunggu Rektor', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    pending_keuangan_akhir: { label: 'Menunggu Keuangan Final', color: 'text-purple-700', bg: 'bg-purple-100' },
    revision_bulanan: { label: 'Perlu Revisi', color: 'text-orange-700', bg: 'bg-orange-100' },
}

export const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
    anggota: { label: 'Anggota', color: 'text-gray-600' },
    kepala_divisi: { label: 'Kepala Divisi', color: 'text-blue-700' },
    dekan: { label: 'Dekan', color: 'text-blue-700' },
    keuangan: { label: 'Keuangan', color: 'text-emerald-700' },
    wakil_rektor_1: { label: 'Wakil Rektor 1', color: 'text-purple-700' },
    wakil_rektor_2: { label: 'Wakil Rektor 2', color: 'text-purple-700' },
    rektor: { label: 'Rektor', color: 'text-purple-700' },
    rektorat: { label: 'Rektorat', color: 'text-purple-700' },
    admin: { label: 'Administrator', color: 'text-red-700' },
}

export const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    submitted: { label: 'Diajukan', color: 'text-blue-600', icon: '📤' },
    approved: { label: 'Disetujui', color: 'text-green-600', icon: '✅' },
    revision: { label: 'Diminta Revisi', color: 'text-orange-600', icon: '🔄' },
    rejected: { label: 'Ditolak', color: 'text-red-600', icon: '❌' },
}
