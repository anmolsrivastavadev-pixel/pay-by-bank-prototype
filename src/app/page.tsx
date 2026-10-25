import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">UKPI prototype</p>
        <h1 className="mt-1 text-3xl font-bold">Pay by bank, no card needed</h1>
        <p className="mt-2 text-slate-600">
          The shop shows a QR code, the shopper scans it and pays straight from their bank account.
        </p>
      </div>
      <Link href="/shop" className="rounded-2xl bg-indigo-600 px-5 py-4 text-center text-lg font-semibold text-white">
        Open the shop till
      </Link>
      <Link href="/history" className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-center text-lg font-semibold">
        Payment history
      </Link>
    </main>
  );
}
