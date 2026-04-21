import { ReviewPageContent } from '@/components/ReviewPageContent'

interface Props {
    params: Promise<{ id: string }>
}

export default async function KeuanganReviewPage({ params }: Props) {
    return (
        <ReviewPageContent
            params={params}
            role="keuangan"
            expectedStatus="pending_keuangan"
            backHref="/keuangan"
        />
    )
}
