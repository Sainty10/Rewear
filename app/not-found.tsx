import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page narrow">
      <div className="eyebrow">A DIFFERENT NEXT CHAPTER</div>
      <h1>This page isn’t available.</h1>
      <p>
        The bundle may have been withdrawn, or this page may be private. There
        may be another good find waiting for you.
      </p>
      <Link className="button" href="/#discover">
        Back to discovery →
      </Link>
    </main>
  );
}
