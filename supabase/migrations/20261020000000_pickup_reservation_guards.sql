-- Apply after the earlier migrations. Keep direct PostgREST RPC calls subject
-- to the same verified-account and pickup-only rules as website checkout.
create or replace function public.reserve_bundle(p_listing uuid,p_delivery text)
returns uuid language plpgsql security definer set search_path=public as $$
declare l listings; oid uuid; amount integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists (
    select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null
  ) then raise exception 'Verify your email before continuing'; end if;
  if p_delivery is distinct from 'pickup' then
    raise exception 'Only local pickup is currently supported';
  end if;
  perform public.claim_usage('action');
  select * into l from listings where id=p_listing for update;
  if l.id is null or l.status<>'active' or l.seller_id=auth.uid() then
    raise exception 'Bundle unavailable';
  end if;
  if not l.pickup then raise exception 'Invalid delivery option'; end if;
  if not exists(select 1 from profiles where id=l.seller_id and charges_enabled) then
    raise exception 'Seller must complete payment onboarding';
  end if;
  select amount_pence into amount from offers
    where listing_id=l.id and buyer_id=auth.uid() and status='accepted';
  amount:=coalesce(amount,l.price_pence);
  insert into orders(listing_id,buyer_id,seller_id,amount_pence,commission_pence,delivery)
    values(l.id,auth.uid(),l.seller_id,amount,round(amount*.1),p_delivery)
    returning id into oid;
  update listings set status='reserved' where id=l.id;
  return oid;
end $$;
revoke all on function public.reserve_bundle(uuid,text) from public,anon;
grant execute on function public.reserve_bundle(uuid,text) to authenticated;
