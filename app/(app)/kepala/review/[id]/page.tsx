import { ReviewPageContent } from '@/components/ReviewPageContent'

interface Props {
    params: Promise<{ id: string }>
}

export default async function KepalaReviewPage({ params }: Props) {
    return (
        <ReviewPageContent
            params={params}
            role="kepala_divisi"
            expectedStatus="pending_kepala"
            backHref="/kepala"
        />
    )
}
