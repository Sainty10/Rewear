-- Run once in a fresh Supabase project's SQL editor. Monetary values are GBP pence.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users on delete cascade, display_name text not null default 'Rewear member', bio text default '', town text default '', stripe_account_id text unique, charges_enabled boolean not null default false, created_at timestamptz default now());
create table public.admins(user_id uuid primary key references auth.users);
create table public.photos(id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users, path text unique not null, created_at timestamptz default now());
create table public.listings(id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.profiles, title text not null check(length(title) between 8 and 120),description text not null check(length(description) between 20 and 4000),category text not null check(category in ('Baby','Kids','Women','Men','Other')),size text not null,brand text not null,condition text not null check(condition in ('New with tags','Like new','Good','Fair')),quantity integer not null check(quantity between 1 and 100),price_pence integer not null check(price_pence between 100 and 100000),location text not null,pickup boolean not null default false,photos uuid[] not null check(cardinality(photos) between 1 and 8),cover_url text,status text not null default 'active' check(status in ('active','reserved','sold','removed')),verified boolean not null check(verified),created_at timestamptz default now());
create table public.favorites(user_id uuid references auth.users,listing_id uuid references public.listings on delete cascade,primary key(user_id,listing_id));
create table public.saved_searches(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,name text not null,filters jsonb not null default '{}',created_at timestamptz default now());
create table public.alerts(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,listing_id uuid not null references public.listings,search_id uuid not null references public.saved_searches on delete cascade,created_at timestamptz default now(),unique(user_id,listing_id,search_id));
create table public.offers(id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.listings,buyer_id uuid not null references auth.users,amount_pence integer not null check(amount_pence>=100),status text not null default 'pending' check(status in ('pending','accepted','rejected')),created_at timestamptz default now());
create unique index one_accepted_offer on public.offers(listing_id) where status='accepted';
create table public.orders(id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.listings,buyer_id uuid not null references auth.users,seller_id uuid not null references auth.users,amount_pence integer not null,commission_pence integer not null,delivery text not null check(delivery in ('shipping','pickup')),status text not null default 'pending' check(status in ('pending','paid','shipped','completed','refunded','expired','disputed')),stripe_session_id text unique,stripe_payment_intent text unique,shipping_address jsonb,tracking_url text,label_url text,created_at timestamptz default now(),paid_at timestamptz,completed_at timestamptz, check(buyer_id<>seller_id));
create unique index one_live_order on public.orders(listing_id) where status not in ('expired','refunded');
create table public.messages(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,sender_id uuid not null references auth.users,body text not null check(length(body) between 1 and 2000),created_at timestamptz default now());
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users,listing_id uuid not null references public.listings,reason text not null check(length(reason) between 10 and 2000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz default now());
create table public.disputes(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,opened_by uuid not null references auth.users,reason text not null check(length(reason) between 10 and 2000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz default now());
create table public.webhook_events(id text primary key,created_at timestamptz default now());
create table public.analytics_events(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,event text not null check(event in ('listing_view','checkout_started')),created_at timestamptz default now());
create table public.acquisition_costs(id uuid primary key default gen_random_uuid(),amount_pence integer not null check(amount_pence>=0),channel text not null,incurred_at timestamptz not null default now());
create table public.order_costs(order_id uuid primary key references public.orders,processing_pence integer not null default 0,shipping_subsidy_pence integer not null default 0,other_pence integer not null default 0);
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.admins where user_id=auth.uid()) and coalesce(auth.jwt()->>'aal','aal1')='aal2'$$;
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(id,display_name) values(new.id,coalesce(left(new.raw_user_meta_data->>'display_name',80),'Rewear member'));return new;end$$;
create trigger on_new_user after insert on auth.users for each row execute function public.new_profile();
create function public.validate_listing() returns trigger language plpgsql security definer set search_path=public as $$begin
 if (select count(*) from photos where id=any(new.photos) and owner_id=new.seller_id)<>cardinality(new.photos) then raise exception 'Photos must belong to seller and be unique';end if;
 if TG_OP='UPDATE' and exists(select 1 from orders where listing_id=old.id and status not in ('expired','refunded')) and (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then raise exception 'Cannot edit a purchased or reserved bundle'; end if;
 return new;end$$;
create trigger validate_listing before insert or update on public.listings for each row execute function public.validate_listing();
create function public.notify_searches() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into alerts(user_id,listing_id,search_id) select s.user_id,new.id,s.id from saved_searches s where s.user_id<>new.seller_id and not exists(select 1 from jsonb_each_text(s.filters) f where f.value<>'' and case when f.key='max_price' then case when f.value ~ '^[0-9]{1,8}$' then new.price_pence>f.value::integer else true end when f.key in ('size','brand','condition','category','location') then lower(to_jsonb(new)->>f.key) not like '%'||lower(f.value)||'%' else true end);return new;end$$;
create trigger notify_searches after insert on public.listings for each row execute function public.notify_searches();
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select using(true);
create policy profile_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
-- Stripe identifiers are server managed. Only these columns may be updated by users.
revoke update on public.profiles from authenticated; grant update(display_name,bio,town) on public.profiles to authenticated;
do $$ declare t text; begin foreach t in array array['admins','photos','listings','favorites','saved_searches','alerts','offers','orders','messages','reports','disputes','webhook_events','analytics_events','acquisition_costs','order_costs'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy photos_read on photos for select using(owner_id=auth.uid());
-- Photo metadata is inserted only by the server after sanitizing image bytes.
create policy listing_read on listings for select using(status in ('active','sold','reserved') or seller_id=auth.uid() or is_admin());
create policy listing_insert on listings for insert with check(seller_id=auth.uid() and status='active');
-- Listing mutation and all financial mutations use validated server operations only.
create policy favorites_own on favorites for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy searches_own on saved_searches for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy alerts_read on alerts for select using(user_id=auth.uid());
create policy offers_read on offers for select using(buyer_id=auth.uid() or exists(select 1 from listings l where l.id=listing_id and l.seller_id=auth.uid()));
create policy offers_insert on offers for insert with check(buyer_id=auth.uid() and status='pending' and exists(select 1 from listings l where l.id=listing_id and l.status='active' and l.seller_id<>auth.uid() and amount_pence<=l.price_pence));
create policy orders_read on orders for select using(buyer_id=auth.uid() or seller_id=auth.uid() or is_admin());
create policy messages_read on messages for select using(exists(select 1 from orders o where o.id=order_id and auth.uid() in(o.buyer_id,o.seller_id)));
create policy messages_insert on messages for insert with check(sender_id=auth.uid() and exists(select 1 from orders o where o.id=order_id and auth.uid() in(o.buyer_id,o.seller_id) and o.status<>'expired'));
create policy reports_insert on reports for insert with check(reporter_id=auth.uid() and status='open');
create policy reports_read on reports for select using(reporter_id=auth.uid() or is_admin());
create policy disputes_insert on disputes for insert with check(opened_by=auth.uid() and status='open' and exists(select 1 from orders o where o.id=order_id and auth.uid() in(o.buyer_id,o.seller_id) and o.status in ('paid','shipped','completed','disputed')));
create policy disputes_read on disputes for select using(opened_by=auth.uid() or is_admin());
create policy analytics_insert on analytics_events for insert with check(user_id=auth.uid());
create policy costs_admin on acquisition_costs for all using(is_admin()) with check(is_admin());
create function public.reserve_bundle(p_listing uuid,p_delivery text) returns uuid language plpgsql security definer set search_path=public as $$declare l listings; oid uuid; amount integer; begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into l from listings where id=p_listing for update;
 if l.id is null or l.status<>'active' or l.seller_id=auth.uid() then raise exception 'Bundle unavailable';end if;
 if p_delivery not in ('shipping','pickup') or (p_delivery='pickup' and not l.pickup) then raise exception 'Invalid delivery option';end if;
 if not exists(select 1 from profiles where id=l.seller_id and charges_enabled) then raise exception 'Seller must complete payment onboarding';end if;
 select amount_pence into amount from offers where listing_id=l.id and buyer_id=auth.uid() and status='accepted';
 amount:=coalesce(amount,l.price_pence);
 insert into orders(listing_id,buyer_id,seller_id,amount_pence,commission_pence,delivery) values(l.id,auth.uid(),l.seller_id,amount,round(amount*.1),p_delivery) returning id into oid;
 update listings set status='reserved' where id=l.id;return oid;end$$;
revoke all on function public.reserve_bundle(uuid,text) from public;grant execute on function public.reserve_bundle(uuid,text) to authenticated;
create function public.accept_offer(p_offer uuid) returns void language plpgsql security definer set search_path=public as $$declare o offers; begin
 select * into o from offers where id=p_offer;
 perform 1 from listings where id=o.listing_id and seller_id=auth.uid() and status='active' for update;
 if not found or o.status<>'pending' then raise exception 'Offer unavailable';end if;
 update offers set status='rejected' where listing_id=o.listing_id and status='accepted';update offers set status='accepted' where id=p_offer;end$$;
revoke all on function public.accept_offer(uuid) from public;grant execute on function public.accept_offer(uuid) to authenticated;
-- Private originals; server issues expiring URLs. No anonymous storage policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('listing-photos','listing-photos',false,8388608,array['image/jpeg','image/png','image/webp']);
-- Uploads go through the authenticated server endpoint for metadata stripping and rate limits.
create policy read_own_photo on storage.objects for select to authenticated using(bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text);
-- Never expose private shipping addresses to marketplace browsing clients.
revoke select on public.orders from anon,authenticated;
grant select(id,listing_id,buyer_id,seller_id,amount_pence,commission_pence,delivery,status,stripe_session_id,stripe_payment_intent,tracking_url,label_url,created_at,paid_at,completed_at) on public.orders to authenticated;
create function public.apply_payment_event(p_event text,p_order uuid,p_session text,p_intent text,p_paid boolean) returns void language plpgsql security definer set search_path=public as $$declare o orders; begin
 insert into webhook_events(id) values(p_event) on conflict do nothing;if not found then return;end if;
 select * into o from orders where id=p_order for update;
 if o.id is null then raise exception 'Unknown order';end if;
 if o.stripe_session_id is not null and o.stripe_session_id<>p_session then raise exception 'Session mismatch';end if;
 if o.status<>'pending' then return;end if;
 if p_paid then update orders set status='paid',stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now() where id=o.id;update listings set status='sold' where id=o.listing_id;
 else update orders set status='expired' where id=o.id;update listings set status='active' where id=o.listing_id and status='reserved';end if;end$$;
revoke all on function public.apply_payment_event(text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.apply_payment_event(text,uuid,text,text,boolean) to service_role;
create function public.apply_refund_event(p_event text,p_intent text) returns void language plpgsql security definer set search_path=public as $$begin
 insert into webhook_events(id) values(p_event) on conflict do nothing;if not found then return;end if;
 perform 1 from orders where stripe_payment_intent=p_intent and status in ('paid','shipped','completed','disputed','refunded') for update;
 if not found then raise exception 'Payment must be recorded before its refund';end if;
 update orders set status='refunded' where stripe_payment_intent=p_intent and status in ('paid','shipped','completed','disputed');
 end$$;
revoke all on function public.apply_refund_event(text,text) from public,anon,authenticated;grant execute on function public.apply_refund_event(text,text) to service_role;
create table public.usage_limits(user_id uuid not null references auth.users,action text not null,window_start timestamptz not null,requests integer not null,primary key(user_id,action,window_start));
alter table public.usage_limits enable row level security;
create function public.claim_usage(p_action text) returns void language plpgsql security definer set search_path=public as $$declare n integer; cap integer;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 cap:=case p_action when 'draft' then 10 when 'upload' then 40 when 'action' then 100 else 0 end;
 if cap=0 then raise exception 'Unsupported action';end if;
 insert into usage_limits(user_id,action,window_start,requests) values(auth.uid(),p_action,date_trunc('hour',now()),1) on conflict(user_id,action,window_start) do update set requests=usage_limits.requests+1 returning requests into n;
 if n>cap then raise exception 'Hourly request limit reached';end if;end$$;
revoke all on function public.claim_usage(text) from public;grant execute on function public.claim_usage(text) to authenticated;
-- Personal searches must contain only supported string filters; malformed price filters cannot disrupt publication.
create function public.valid_search_filters(f jsonb) returns boolean language sql immutable as $$
 select jsonb_typeof(f)='object' and not exists(select 1 from jsonb_each(f) e where e.key not in ('size','brand','category','condition','location','max_price') or jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>80 or (e.key='max_price' and (e.value#>>'{}') !~ '^[0-9]{1,8}$'))
$$;
alter table public.saved_searches add constraint valid_filters check(public.valid_search_filters(filters));
revoke select on public.profiles from anon,authenticated;
grant select(id,display_name,bio,town,charges_enabled,created_at) on public.profiles to anon,authenticated;
create table public.audit_log(id uuid primary key default gen_random_uuid(),actor_id uuid,entity text not null,entity_id uuid not null,old_status text,new_status text,created_at timestamptz not null default now());
alter table public.audit_log enable row level security;
create policy audit_admin_read on public.audit_log for select using(is_admin());
create function public.audit_status() returns trigger language plpgsql security definer set search_path=public as $$begin
 if old.status is distinct from new.status then insert into audit_log(actor_id,entity,entity_id,old_status,new_status) values(auth.uid(),TG_TABLE_NAME,new.id,old.status,new.status);end if;return new;end$$;
create trigger audit_orders after update on orders for each row execute function public.audit_status();
create trigger audit_listings after update on listings for each row execute function public.audit_status();
create trigger audit_reports after update on reports for each row execute function public.audit_status();
create trigger audit_disputes after update on disputes for each row execute function public.audit_status();
create function public.rate_limit_write() returns trigger language plpgsql security definer set search_path=public as $$begin if auth.uid() is not null then perform claim_usage('action');end if;return new;end$$;
create trigger throttle_listings before insert on listings for each row execute function public.rate_limit_write();
create trigger throttle_offers before insert on offers for each row execute function public.rate_limit_write();
create trigger throttle_messages before insert on messages for each row execute function public.rate_limit_write();
create trigger throttle_reports before insert on reports for each row execute function public.rate_limit_write();
create trigger throttle_disputes before insert on disputes for each row execute function public.rate_limit_write();
create trigger throttle_searches before insert on saved_searches for each row execute function public.rate_limit_write();
