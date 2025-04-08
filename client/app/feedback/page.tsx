import CommentForm from "@/components/comment-form"

export default function FeedbackPage() {
    return (
        <div className="container max-w-2xl mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Feedback & Comments</h1>
            <p className="mb-6 text-muted-foreground">
                We value your feedback! Please use the form below to share your thoughts, suggestions, or report any issues
                you've encountered with the parking system.
            </p>
            <CommentForm />
        </div>
    )
}
