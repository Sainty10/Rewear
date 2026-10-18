"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page narrow">
      <div className="eyebrow">LET’S PICK THIS UP AGAIN</div>
      <h1>Something interrupted this page.</h1>
      <p>
        Please try loading it again. If you were checking out, check your order
        status before starting another payment.
      </p>
      <div className="inline-form">
        <button className="button" onClick={reset}>
          Try loading again
        </button>
        <Link className="text-link" href="/account">
          Check your orders →
        </Link>
      </div>
    </main>
  );
}
