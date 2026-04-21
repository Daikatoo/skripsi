'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

export function ExportActionClient({ parsedDataStr, fileName, docUrl, docName }: any) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExportExcel = () => {
        setIsExporting(true)
        try {
            const data = JSON.parse(parsedDataStr)
            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Anggaran")
            XLSX.writeFile(workbook, fileName || 'anggaran_export.xlsx')
        } catch (e) {
            console.error("Gagal export excel:", e)
            alert("Gagal merakit file Excel.")
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
            <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="btn btn-outline btn-sm"
                style={{ background: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                {isExporting ? '🔄 Merakit...' : '📊 Unduh Excel (.xlsx)'}
            </button>

            {docUrl && (
                <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ background: 'white', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    download={docName || 'lampiran.pdf'}
                >
                    📄 Buka Lampiran
                    {docName && <span style={{ fontSize: '10px', color: '#64748b' }}>({docName})</span>}
                </a>
            )}
        </div>
    )
}
