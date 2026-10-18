-- Additive migration: preserve legacy listings and payment history.
alter table public.listings add column items jsonb not null default '[]'::jsonb;
create function public.validate_bundle_contents() returns trigger language plpgsql set search_path=public as $$
declare item jsonb; pieces integer := 0;
begin
  if octet_length(new.items::text)>128000 then raise exception 'Bundle details are too large';end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) not between 1 and 30 then raise exception 'Add 1 to 30 clothing groups'; end if;
  for item in select value from jsonb_array_elements(new.items) loop
    if jsonb_typeof(item) <> 'object' then raise exception 'Each clothing group must be an object';end if;
    if exists(select 1 from jsonb_object_keys(item) k where k not in ('name','size','brand','condition','quantity','notes'))
       or jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name')) not between 2 and 80
       or jsonb_typeof(item->'size') is distinct from 'string' or length(btrim(item->>'size')) not between 1 and 40
       or jsonb_typeof(item->'brand') is distinct from 'string' or length(btrim(item->>'brand')) not between 1 and 80
       or jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes') > 500
       or jsonb_typeof(item->'condition') is distinct from 'string' or item->>'condition' not in ('New with tags','Like new','Good','Fair')
       or jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity') !~ '^([1-9][0-9]?|100)$'
    then raise exception 'Each clothing group needs valid item, size, brand, condition and quantity details'; end if;
    pieces := pieces + (item->>'quantity')::integer;
  end loop;
  if pieces <> new.quantity or pieces > 100 then raise exception 'Piece count does not match bundle contents'; end if;
  return new;
end $$;
create trigger validate_bundle_contents before insert or update of items, quantity on public.listings for each row execute function public.validate_bundle_contents();

-- Only a trusted server can release an orphan after checking Stripe exhaustively.
-- Waiting 65 minutes ensures the fixed one-hour Checkout expiry has elapsed.
create function public.release_orphan_order(p_order uuid) returns void language plpgsql security definer set search_path=public as $$
declare o orders;
begin
  select * into o from orders where id=p_order for update;
  if o.id is null or o.status<>'pending' or o.stripe_session_id is not null or o.created_at > now()-interval '65 minutes' then raise exception 'Order is not eligible for orphan recovery'; end if;
  update orders set status='expired' where id=o.id;
  update listings set status='active' where id=o.listing_id and status='reserved';
end $$;
revoke all on function public.release_orphan_order(uuid) from public,anon,authenticated;
grant execute on function public.release_orphan_order(uuid) to service_role;
create index listings_active_discovery on public.listings(category,created_at desc) where status='active';
alter table public.listings add column unit_price_pence numeric generated always as (price_pence::numeric / quantity) stored;
create index listings_active_per_piece on public.listings(unit_price_pence) where status='active';
-- Treat common hyphen/dash spellings consistently in family size searches.
alter table public.listings add column size_search text generated always as (lower(regexp_replace(translate(size,'–—','--'),'[[:space:]]+',' ','g'))) stored;
create or replace function public.validate_listing() returns trigger language plpgsql security definer set search_path=public as $$begin
 if (select count(*) from photos where id=any(new.photos) and owner_id=new.seller_id)<>cardinality(new.photos) then raise exception 'Photos must belong to seller and be unique';end if;
 if TG_OP='UPDATE' and exists(select 1 from orders where listing_id=old.id and status not in ('expired','refunded')) and (to_jsonb(new)-array['status','unit_price_pence','size_search']) is distinct from (to_jsonb(old)-array['status','unit_price_pence','size_search']) then raise exception 'Cannot edit a purchased or reserved bundle';end if;
 return new;end $$;
create or replace function public.notify_searches() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into alerts(user_id,listing_id,search_id)
 select s.user_id,new.id,s.id from saved_searches s where s.user_id<>new.seller_id and not exists(
 select 1 from jsonb_each_text(s.filters) f where f.value<>'' and case
 when f.key='max_price' then case when f.value ~ '^[0-9]{1,8}$' then new.price_pence>f.value::integer else true end
 when f.key='size' then lower(regexp_replace(translate(new.size,'–—','--'),'[[:space:]]+',' ','g')) not like '%'||lower(regexp_replace(translate(f.value,'–—','--'),'[[:space:]]+',' ','g'))||'%'
 when f.key in ('brand','condition','category','location') then lower(to_jsonb(new)->>f.key) not like '%'||lower(f.value)||'%'
 else true end);
 return new;end $$;
