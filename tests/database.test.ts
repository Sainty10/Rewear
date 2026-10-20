import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
let pg: PGlite;
const seller = "00000000-0000-4000-8000-000000000001",
  buyer = "00000000-0000-4000-8000-000000000002",
  stranger = "00000000-0000-4000-8000-000000000003",
  photo = "00000000-0000-4000-8000-000000000004",
  listing = "00000000-0000-4000-8000-000000000005";
async function asUser(id: string, sql: string) {
  await pg.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await pg.query(sql);
  } finally {
    await pg.exec("reset role");
  }
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1'))$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to authenticated,anon,service_role;
alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
`);
  const sql = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync("supabase/migrations/" + f, "utf8"))
    .join("\n")
    .replace("create extension if not exists pgcrypto;", "");
  await pg.exec(sql);
  await pg.exec(`grant select on auth.users to authenticated;grant execute on function auth.uid() to authenticated;
insert into auth.users(id,email_confirmed_at) values('${seller}',now()),('${buyer}',now()),('${stranger}',now());
update profiles set charges_enabled=true,stripe_account_id='acct_test' where id='${seller}';
insert into photos(id,owner_id,path) values('${photo}','${seller}','${seller}/photo.webp');
insert into listings(id,seller_id,title,description,category,size,brand,condition,quantity,price_pence,location,pickup,photos,verified,items) values('${listing}','${seller}','Winter clothing bundle','Five winter layers with defects clearly disclosed.','Kids','2–3','Mixed','Good',5,1200,'Bristol',true,array['${photo}'::uuid],true,'[{"name":"Layers","size":"2–3","brand":"Mixed","condition":"Good","quantity":5,"notes":"Wear disclosed"}]'::jsonb);`);
}, 30000);
afterAll(async () => {
  await pg.close();
});
describe.sequential(
  "PostgreSQL authorization and transaction invariants",
  () => {
    it("creates a profile for each real auth user", async () =>
      expect(
        (await pg.query("select count(*)::int as n from profiles")).rows,
      ).toEqual([{ n: 3 }]));
    it("blocks profile privilege escalation", async () =>
      await expect(
        asUser(
          buyer,
          `update profiles set charges_enabled=true where id='${buyer}'`,
        ),
      ).rejects.toThrow(/permission denied/));
    it("isolates private photos", async () =>
      expect((await asUser(buyer, "select * from photos")).rows).toHaveLength(
        0,
      ));
    it("prevents arbitrary order insertion", async () =>
      await expect(
        asUser(
          buyer,
          `insert into orders(listing_id,buyer_id,seller_id,amount_pence,commission_pence,delivery) values('${listing}','${buyer}','${seller}',1,0,'pickup')`,
        ),
      ).rejects.toThrow(/row-level security/));
    it("prevents buying own listing", async () =>
      await expect(
        asUser(seller, `select reserve_bundle('${listing}','pickup')`),
      ).rejects.toThrow(/unavailable/));
    it("requires a signed-in account even for a direct reservation RPC", async () => {
      await expect(
        asUser("", `select reserve_bundle('${listing}','pickup')`),
      ).rejects.toThrow(/Sign in required/);
    });
    it("rejects unverified email accounts through a direct reservation RPC", async () => {
      await pg.exec(
        `update auth.users set email_confirmed_at=null where id='${buyer}'`,
      );
      try {
        await expect(
          asUser(buyer, `select reserve_bundle('${listing}','pickup')`),
        ).rejects.toThrow(/Verify your email/);
        expect(
          (await pg.query(`select status from listings where id='${listing}'`))
            .rows,
        ).toEqual([{ status: "active" }]);
        expect((await pg.query("select id from orders")).rows).toHaveLength(0);
      } finally {
        await pg.exec(
          `update auth.users set email_confirmed_at=now() where id='${buyer}'`,
        );
      }
    });
    it.each(["'shipping'", "'courier'", "null"])(
      "rejects unsupported delivery %s without reserving inventory",
      async (delivery) => {
        await expect(
          asUser(buyer, `select reserve_bundle('${listing}',${delivery})`),
        ).rejects.toThrow(/Only local pickup/);
        expect(
          (await pg.query(`select status from listings where id='${listing}'`))
            .rows,
        ).toEqual([{ status: "active" }]);
        expect((await pg.query("select id from orders")).rows).toHaveLength(0);
      },
    );
    it("requires the listing to explicitly allow local pickup", async () => {
      await pg.exec(`update listings set pickup=false where id='${listing}'`);
      try {
        await expect(
          asUser(buyer, `select reserve_bundle('${listing}','pickup')`),
        ).rejects.toThrow(/Invalid delivery option/);
        expect((await pg.query("select id from orders")).rows).toHaveLength(0);
      } finally {
        await pg.exec(`update listings set pickup=true where id='${listing}'`);
      }
    });
    it("cannot bypass the action quota with a direct reservation RPC", async () => {
      await pg.exec(`insert into usage_limits(user_id,action,window_start,requests)
        values('${buyer}','action',date_trunc('hour',now()),100)
        on conflict(user_id,action,window_start) do update set requests=100`);
      try {
        await expect(
          asUser(buyer, `select reserve_bundle('${listing}','pickup')`),
        ).rejects.toThrow(/Hourly request limit/);
        expect(
          (await pg.query(`select status from listings where id='${listing}'`))
            .rows,
        ).toEqual([{ status: "active" }]);
        expect((await pg.query("select id from orders")).rows).toHaveLength(0);
      } finally {
        await pg.exec(
          `delete from usage_limits where user_id='${buyer}' and action='action'`,
        );
      }
    });
    it("reserves inventory with authoritative price and fee", async () => {
      await asUser(buyer, `select reserve_bundle('${listing}','pickup')`);
      const { rows } = await pg.query(
        "select amount_pence,commission_pence,status from orders",
      );
      expect(rows).toEqual([
        { amount_pence: 1200, commission_pence: 120, status: "pending" },
      ]);
      expect(
        (
          await pg.query(`select requests from usage_limits
        where user_id='${buyer}' and action='action'
        and window_start=date_trunc('hour',now())`)
        ).rows,
      ).toEqual([{ requests: 1 }]);
    });
    it("prevents a second buyer from purchasing reserved inventory", async () =>
      await expect(
        asUser(stranger, `select reserve_bundle('${listing}','pickup')`),
      ).rejects.toThrow(/unavailable/));
    it("hides another buyer’s orders and messages", async () =>
      expect(
        (await asUser(stranger, "select id from orders")).rows,
      ).toHaveLength(0));
    it("denies address reads through the public API", async () =>
      await expect(
        asUser(buyer, "select shipping_address from orders"),
      ).rejects.toThrow(/permission denied/));
    it("prevents customers from confirming payments", async () =>
      await expect(
        asUser(
          buyer,
          `select apply_payment_event('evt_forged',(select id from orders),'cs_fake','pi_fake',true)`,
        ),
      ).rejects.toThrow(/permission denied/));
    it("only processes webhook events once", async () => {
      const { rows } = await pg.query<{ id: string }>("select id from orders");
      await pg.query(
        `select apply_payment_event('evt_paid',$1,'cs_verified','pi_verified',true)`,
        [rows[0].id],
      );
      await pg.query(
        `select apply_payment_event('evt_paid',$1,'cs_verified','pi_verified',true)`,
        [rows[0].id],
      );
      expect((await pg.query("select status from orders")).rows).toEqual([
        { status: "paid" },
      ]);
      expect(
        (
          await pg.query(
            "select count(*)::int n from webhook_events where id='evt_paid'",
          )
        ).rows,
      ).toEqual([{ n: 1 }]);
    });
    it("prevents unrelated users from sending order messages", async () => {
      const { rows } = await pg.query<{ id: string }>("select id from orders");
      await expect(
        asUser(
          stranger,
          `insert into messages(order_id,sender_id,body) values('${rows[0].id}','${stranger}','Please send me the address')`,
        ),
      ).rejects.toThrow(/row-level security/);
    });
    it("allows an order participant to send a message", async () => {
      const { rows } = await pg.query<{ id: string }>("select id from orders");
      await asUser(
        buyer,
        `insert into messages(order_id,sender_id,body) values('${rows[0].id}','${buyer}','Can we meet at the town centre?')`,
      );
      expect(
        (await asUser(seller, "select body from messages")).rows,
      ).toHaveLength(1);
    });
    it("prevents an unprivileged user granting admin access", async () =>
      await expect(
        asUser(buyer, `insert into admins values('${buyer}')`),
      ).rejects.toThrow(/row-level security/));
    it("blocks a buyer from inserting photos owned by a different seller", async () =>
      await expect(
        asUser(
          buyer,
          `insert into photos(owner_id,path) values('${seller}','${seller}/spoof.webp')`,
        ),
      ).rejects.toThrow(/row-level security/));
    it("rejects malformed saved-search prices before they can break inventory publication", async () =>
      await expect(
        asUser(
          buyer,
          `insert into saved_searches(user_id,name,filters) values('${buyer}','Bad search','{"max_price":"not-a-price"}')`,
        ),
      ).rejects.toThrow(/valid_filters/));
    it("limits AI calls independently for each user", async () => {
      for (let i = 0; i < 10; i++)
        await asUser(buyer, `select claim_usage('draft')`);
      await expect(
        asUser(buyer, `select claim_usage('draft')`),
      ).rejects.toThrow(/limit/);
      await asUser(seller, `select claim_usage('draft')`);
    });
    it("blocks changing the price of a purchased bundle even for a privileged operational writer", async () =>
      await expect(
        pg.exec(`update listings set price_pence=1 where id='${listing}'`),
      ).rejects.toThrow());
    it("does not accept a webhook from a different checkout session", async () => {
      const { rows } = await pg.query<{ id: string }>("select id from orders");
      await expect(
        pg.query(
          `select apply_payment_event('evt_wrong',$1,'cs_wrong','pi_wrong',false)`,
          [rows[0].id],
        ),
      ).rejects.toThrow(/Session mismatch/);
      expect((await pg.query("select status from orders")).rows).toEqual([
        { status: "paid" },
      ]);
    });
    it("requires both an administrator role and AAL2 authentication", async () => {
      await pg.exec(`insert into admins values('${stranger}')`);
      expect(
        (await asUser(stranger, "select is_admin() as admin")).rows,
      ).toEqual([{ admin: false }]);
      await pg.exec("select set_config('request.jwt.claim.aal','aal2',false)");
      expect(
        (await asUser(stranger, "select is_admin() as admin")).rows,
      ).toEqual([{ admin: true }]);
      await pg.exec("select set_config('request.jwt.claim.aal','aal1',false)");
    });
    it("records full refunds idempotently", async () => {
      await pg.exec(
        "select apply_refund_event('evt_refund','pi_verified');select apply_refund_event('evt_refund','pi_verified');",
      );
      expect((await pg.query("select status from orders")).rows).toEqual([
        { status: "refunded" },
      ]);
    });
  },
);

describe.sequential("Saved discovery and negotiated checkout", () => {
  const next = "00000000-0000-4000-8000-000000000006";
  let offer: string;
  it("delivers an alert only to matching saved searches", async () => {
    await asUser(
      buyer,
      `insert into saved_searches(user_id,name,filters) values('${buyer}','Bristol kids','{"category":"Kids","max_price":"2000"}')`,
    );
    await asUser(
      stranger,
      `insert into saved_searches(user_id,name,filters) values('${stranger}','Baby clothes','{"category":"Baby"}')`,
    );
    await pg.exec(
      `insert into listings(id,seller_id,title,description,category,size,brand,condition,quantity,price_pence,location,pickup,photos,verified,items) values('${next}','${seller}','Summer clothing bundle','A summer bundle with all wear and marks disclosed.','Kids','2–3','Mixed','Good',3,1800,'Bristol',true,array['${photo}'::uuid],true,'[{"name":"Layers","size":"2–3","brand":"Mixed","condition":"Good","quantity":3,"notes":"Wear disclosed"}]'::jsonb);`,
    );
    expect((await asUser(buyer, "select id from alerts")).rows).toHaveLength(1);
    expect((await asUser(stranger, "select id from alerts")).rows).toHaveLength(
      0,
    );
  });
  it("lets a buyer make an offer", async () => {
    const r = await asUser(
      buyer,
      `insert into offers(listing_id,buyer_id,amount_pence) values('${next}','${buyer}',1500) returning id`,
    );
    offer = String((r.rows[0] as any).id);
  });
  it("prevents another buyer from accepting it", async () =>
    await expect(
      asUser(stranger, `select accept_offer('${offer}')`),
    ).rejects.toThrow(/unavailable/));
  it("lets only the seller accept an offer", async () => {
    await asUser(seller, `select accept_offer('${offer}')`);
  });
  it("charges the accepted amount rather than a client-supplied price", async () => {
    await asUser(buyer, `select reserve_bundle('${next}','pickup')`);
    expect(
      (
        await pg.query(
          `select amount_pence,commission_pence from orders where listing_id='${next}'`,
        )
      ).rows,
    ).toEqual([{ amount_pence: 1500, commission_pence: 150 }]);
  });
  it("releases inventory on verified session expiration", async () => {
    const { rows } = await pg.query<{ id: string }>(
      `select id from orders where listing_id='${next}'`,
    );
    await pg.query(
      `select apply_payment_event('evt_expired',$1,'cs_expired',null,false)`,
      [rows[0].id],
    );
    expect(
      (await pg.query(`select status from listings where id='${next}'`)).rows,
    ).toEqual([{ status: "active" }]);
  });
});

describe.sequential("Bundle detail integrity and orphan recovery", () => {
  const id = "00000000-0000-4000-8000-000000000007";
  let orderId: string;
  const contents = [
    {
      name: "T-shirts",
      size: "2–3",
      brand: "Mixed",
      condition: "Good",
      quantity: 2,
      notes: "A small mark on one sleeve",
    },
  ];
  const insert = `insert into listings(id,seller_id,title,description,category,size,brand,condition,quantity,price_pence,location,pickup,photos,verified,items) values('${id}','${seller}','Two cotton T-shirts','Two cotton tops, with all defects disclosed.','Kids','2–3','Mixed','Good',2,1000,'Bath',true,array['${photo}'::uuid],true,$1::jsonb)`;
  it("rejects a forged total even through a direct database insert", async () => {
    await expect(
      pg.query(insert, [JSON.stringify([{ ...contents[0], quantity: 3 }])]),
    ).rejects.toThrow(/Piece count/);
  });
  it("requires the size and brand for every clothing group", async () => {
    await expect(
      pg.query(insert, [JSON.stringify([{ ...contents[0], brand: "" }])]),
    ).rejects.toThrow(/valid item/);
  });
  it("rejects unsupported fields in bundle contents", async () => {
    await expect(
      pg.query(insert, [
        JSON.stringify([{ ...contents[0], hiddenPayload: "not allowed" }]),
      ]),
    ).rejects.toThrow(/valid item/);
  });
  it("computes the searchable unit price in PostgreSQL", async () => {
    await asUser(
      buyer,
      `insert into saved_searches(user_id,name,filters) values('${buyer}','Hyphen sizes','{"size":"2-3"}')`,
    );
    await pg.query(insert, [JSON.stringify(contents)]);
    expect(
      (
        await pg.query(
          `select unit_price_pence::int as price from listings where id='${id}'`,
        )
      ).rows,
    ).toEqual([{ price: 500 }]);
  });
  it("matches dash variants in search and new-inventory alerts", async () => {
    expect(
      (
        await pg.query(
          `select id from listings where id='${id}' and size_search ilike '%2-3%'`,
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(
          buyer,
          `select id from alerts where listing_id='${id}' and search_id in(select id from saved_searches where name='Hyphen sizes')`,
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("prevents customers from releasing reservations through the server-only recovery function", async () => {
    await asUser(buyer, `select reserve_bundle('${id}','pickup')`);
    orderId = String(
      (
        await pg.query<{ id: string }>(
          `select id from orders where listing_id='${id}'`,
        )
      ).rows[0].id,
    );
    await expect(
      asUser(buyer, `select release_orphan_order('${orderId}')`),
    ).rejects.toThrow(/permission denied/);
  });
  it("keeps a recent orphan reserved", async () =>
    await expect(
      pg.exec(`select release_orphan_order('${orderId}')`),
    ).rejects.toThrow(/not eligible/));
  it("never treats a recorded Stripe session as an orphan", async () => {
    await pg.exec(
      `update orders set created_at=now()-interval '2 hours',stripe_session_id='cs_known' where id='${orderId}'`,
    );
    await expect(
      pg.exec(`select release_orphan_order('${orderId}')`),
    ).rejects.toThrow(/not eligible/);
  });
  it("releases an old sessionless orphan in one transaction", async () => {
    await pg.exec(
      `update orders set stripe_session_id=null where id='${orderId}';select release_orphan_order('${orderId}')`,
    );
    expect(
      (await pg.query(`select status from listings where id='${id}'`)).rows,
    ).toEqual([{ status: "active" }]);
    expect(
      (await pg.query(`select status from orders where id='${orderId}'`)).rows,
    ).toEqual([{ status: "expired" }]);
  });
});
