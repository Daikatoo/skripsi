import { ReviewPageContent } from '@/components/ReviewPageContent'

interface Props {
    params: Promise<{ id: string }>
}

export default async function RektoratReviewPage({ params }: Props) {
    return (
        <ReviewPageContent
            params={params}
            role="rektorat"
            expectedStatus="pending_rektorat"
            backHref="/rektorat"
        />
    )
}
