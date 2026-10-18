import Link from "next/link";
export const metadata = { title: "Buying, selling & safety | Rewear" };
export default function Safety() {
  return (
    <main className="page">
      <div className="eyebrow">GOOD CLOTHES. THOUGHTFUL HANDOVERS.</div>
      <h1>A little care goes a long way.</h1>
      <p>
        These practical steps help you check a bundle and keep personal
        information private. Rewear cannot guarantee the behaviour of another
        member.
      </p>
      <div className="info-grid">
        <article>
          <h2>Before buying</h2>
          <p>
            Check every group’s size, condition, quantity and notes. Look at the
            real photos. Brand and condition are declared by the seller, not
            independently authenticated by Rewear. Keep payment in checkout.
          </p>
        </article>
        <article>
          <h2>Before selling</h2>
          <p>
            Photograph the clothes and disclose stains, repairs, missing labels
            and other defects. Do not include faces, children’s names, school
            badges or an address. Our current marketplace is for clothing; do
            not list recalled or prohibited goods.
          </p>
        </article>
        <article>
          <h2>At local pickup</h2>
          <p>
            Choose a busy public place in daylight and consider bringing another
            adult. Agree details in order messaging. Do not share children’s
            routines, school information or a home address. Check the bundle
            before confirming receipt.
          </p>
        </article>
      </div>
      <section className="panel">
        <h2>Something wrong?</h2>
        <p>
          Use “Report this listing” on a listing page for inappropriate content.
          For an order problem, open your account, find the order and choose
          “There’s a problem with this order”. Keep relevant details in the
          order conversation. Reports and disputes go to the administrator
          dashboard; no response time is guaranteed in this development version.
        </p>
        <Link className="button" href="/account">
          Open your orders →
        </Link>
      </section>
      <div className="notice">
        Payment protection, insurance, escrow and guaranteed refunds are not
        offered by this development version. In an immediate emergency, contact
        your local emergency service. Before public trading begins, Rewear needs
        staffed support, published marketplace terms and validated payment and
        safety operations.
      </div>
    </main>
  );
}
