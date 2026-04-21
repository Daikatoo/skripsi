import * as XLSX from 'xlsx'

export interface ParsedRow {
    [key: string]: string | number
}

export interface ParseResult {
    headers: string[]
    rows: ParsedRow[]
    totalAnggaran: number
}

export function parseXlsxBuffer(buffer: ArrayBuffer): ParseResult {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
        raw: false,
        defval: '',
    })

    if (jsonData.length === 0) {
        return { headers: [], rows: [], totalAnggaran: 0 }
    }

    const headers = Object.keys(jsonData[0])

    // Auto-detect "total" column (case-insensitive)
    const totalKey = headers.find((h) =>
        ['total', 'jumlah', 'amount', 'total anggaran', 'total_anggaran'].includes(
            h.toLowerCase().trim()
        )
    )

    let totalAnggaran = 0
    if (totalKey) {
        totalAnggaran = jsonData.reduce((sum, row) => {
            const val = parseFloat(String(row[totalKey]).replace(/[^0-9.-]/g, ''))
            return sum + (isNaN(val) ? 0 : val)
        }, 0)
    }

    return { headers, rows: jsonData, totalAnggaran }
}
