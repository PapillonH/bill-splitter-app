import Link from "next/link"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Vizzle</p>
          <h1 className="text-3xl font-bold mt-1">Privacy</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated July 27, 2026</p>
        </div>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Receipt scanning</h2>
          <p>
            When you scan a receipt, its compressed image is sent securely to OpenAI for extraction.
            Vizzle does not intentionally save receipt images after the scan request finishes.
            OpenAI processes the image under its API data policies.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Bills saved on your device</h2>
          <p>
            Unfinished bills and recent bill history are stored in your browser. They do not sync
            across devices. You can remove them with “Clear saved data” in the app or by clearing
            this site&apos;s browser data.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Operational information</h2>
          <p>
            Vizzle records basic page views, browser type, and short error messages in hosting logs
            to find reliability problems. It does not include receipt images, extracted items,
            participant names, or bill amounts in these events.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Your choices</h2>
          <p>
            You can use manual entry without sending a receipt image to an AI service. Do not upload
            receipts containing information you do not want processed.
          </p>
        </section>
        <Link className="inline-flex min-h-11 items-center text-primary underline underline-offset-4" href="/">
          Return to Vizzle
        </Link>
      </article>
    </main>
  )
}
