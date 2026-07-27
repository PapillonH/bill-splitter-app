import Link from "next/link"

export default function OfflinePage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">V</div>
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-muted-foreground">
          Reconnect to scan a receipt. Bills already saved in this browser remain available when the app loads.
        </p>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-primary-foreground">Try again</Link>
      </div>
    </main>
  )
}
