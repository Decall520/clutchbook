-- 集火：初始数据库、好友权限与私有媒体存储
-- 在 Supabase SQL Editor 中一次性运行，或使用 supabase db push。

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null default '未命名选手' check (char_length(display_name) between 1 and 40),
  riot_id text check (riot_id is null or char_length(riot_id) <= 40),
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_url text,
  favourite_agent text check (favourite_agent is null or char_length(favourite_agent) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique on public.profiles (lower(username));

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  video_path text not null unique,
  thumbnail_path text,
  duration_seconds numeric(8,2) not null default 0 check (duration_seconds >= 0),
  game_map text check (game_map is null or char_length(game_map) <= 40),
  agent text check (agent is null or char_length(agent) <= 32),
  tags text[] not null default '{}',
  visibility text not null default 'friends' check (visibility in ('public', 'friends', 'private')),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clips_user_created_idx on public.clips (user_id, created_at desc);
create index if not exists clips_visibility_created_idx on public.clips (visibility, created_at desc);

create table if not exists public.clip_likes (
  clip_id uuid not null references public.clips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clip_id, user_id)
);

create table if not exists public.clip_comments (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.clips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists clip_comments_clip_created_idx on public.clip_comments (clip_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists friendships_updated_at on public.friendships;
create trigger friendships_updated_at before update on public.friendships
for each row execute function public.set_updated_at();
drop trigger if exists clips_updated_at on public.clips;
create trigger clips_updated_at before update on public.clips
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'player_' || substr(replace(new.id::text, '-', ''), 1, 10)));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if char_length(base_username) < 3 then
    base_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  base_username := left(base_username, 20);
  final_username := base_username;
  if exists (select 1 from public.profiles where lower(username) = lower(final_username)) then
    final_username := left(base_username, 15) || '_' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;

  insert into public.profiles (id, username, display_name, favourite_agent)
  values (
    new.id,
    final_username,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), final_username), 40),
    nullif(new.raw_user_meta_data ->> 'favourite_agent', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.are_friends(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = first_user and addressee_id = second_user)
        or (requester_id = second_user and addressee_id = first_user)
      )
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create or replace function public.sync_clip_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clips
  set like_count = greatest(0, like_count + case when tg_op = 'INSERT' then 1 else -1 end)
  where id = coalesce(new.clip_id, old.clip_id);
  if tg_op = 'INSERT' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists clip_like_count_changed on public.clip_likes;
create trigger clip_like_count_changed
after insert or delete on public.clip_likes
for each row execute function public.sync_clip_like_count();

create or replace function public.sync_clip_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clips
  set comment_count = greatest(0, comment_count + case when tg_op = 'INSERT' then 1 else -1 end)
  where id = coalesce(new.clip_id, old.clip_id);
  if tg_op = 'INSERT' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists clip_comment_count_changed on public.clip_comments;
create trigger clip_comment_count_changed
after insert or delete on public.clip_comments
for each row execute function public.sync_clip_comment_count();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.clips enable row level security;
alter table public.clip_likes enable row level security;
alter table public.clip_comments enable row level security;

drop policy if exists "authenticated users can view profiles" on public.profiles;
create policy "authenticated users can view profiles"
on public.profiles for select to authenticated
using (true);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "users can view own friendships" on public.friendships;
create policy "users can view own friendships"
on public.friendships for select to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "users can request friendship" on public.friendships;
create policy "users can request friendship"
on public.friendships for insert to authenticated
with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists "addressees can answer friendship requests" on public.friendships;
create policy "addressees can answer friendship requests"
on public.friendships for update to authenticated
using (addressee_id = auth.uid())
with check (addressee_id = auth.uid() and status in ('accepted', 'pending'));

drop policy if exists "participants can remove friendship" on public.friendships;
create policy "participants can remove friendship"
on public.friendships for delete to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "visible clips can be read" on public.clips;
create policy "visible clips can be read"
on public.clips for select to authenticated
using (
  user_id = auth.uid()
  or (status = 'published' and visibility = 'public')
  or (status = 'published' and visibility = 'friends' and public.are_friends(user_id, auth.uid()))
);

drop policy if exists "users can create own clips" on public.clips;
create policy "users can create own clips"
on public.clips for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own clips" on public.clips;
create policy "users can update own clips"
on public.clips for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete own clips" on public.clips;
create policy "users can delete own clips"
on public.clips for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "visible likes can be read" on public.clip_likes;
create policy "visible likes can be read"
on public.clip_likes for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.clips where clips.id = clip_likes.clip_id)
);

drop policy if exists "users can like visible clips" on public.clip_likes;
create policy "users can like visible clips"
on public.clip_likes for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (select 1 from public.clips where clips.id = clip_likes.clip_id)
);

drop policy if exists "users can remove own likes" on public.clip_likes;
create policy "users can remove own likes"
on public.clip_likes for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "visible comments can be read" on public.clip_comments;
create policy "visible comments can be read"
on public.clip_comments for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.clips where clips.id = clip_comments.clip_id)
);

drop policy if exists "users can comment on visible clips" on public.clip_comments;
create policy "users can comment on visible clips"
on public.clip_comments for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (select 1 from public.clips where clips.id = clip_comments.clip_id)
);

drop policy if exists "users can delete own comments" on public.clip_comments;
create policy "users can delete own comments"
on public.clip_comments for delete to authenticated
using (user_id = auth.uid());

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.clips to authenticated;
grant select, insert, delete on public.clip_likes to authenticated;
grant select, insert, delete on public.clip_comments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'highlights',
  'highlights',
  false,
  1073741824,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own highlight files" on storage.objects;
create policy "users upload own highlight files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "visible highlight files can be read" on storage.objects;
create policy "visible highlight files can be read"
on storage.objects for select to authenticated
using (
  bucket_id = 'highlights'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.clips
      where clips.video_path = storage.objects.name
        and clips.status = 'published'
        and (
          clips.visibility = 'public'
          or (clips.visibility = 'friends' and public.are_friends(clips.user_id, auth.uid()))
        )
    )
  )
);

drop policy if exists "users update own highlight files" on storage.objects;
create policy "users update own highlight files"
on storage.objects for update to authenticated
using (
  bucket_id = 'highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own highlight files" on storage.objects;
create policy "users delete own highlight files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "public can read avatars" on storage.objects;
create policy "public can read avatars"
on storage.objects for select to public
using (bucket_id = 'avatars');

drop policy if exists "users upload own avatars" on storage.objects;
create policy "users upload own avatars"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users update own avatars" on storage.objects;
create policy "users update own avatars"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own avatars" on storage.objects;
create policy "users delete own avatars"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
