-- Bunny AI: initial schema.
--
-- Every table is owned by a user and protected by Row Level Security, so the
-- database itself refuses cross-user access no matter what the app sends.
-- `user_id` defaults to auth.uid(): the client never supplies it, and the
-- policies reject any row whose user_id is not the signed-in user.
--
-- Apply with the Supabase SQL editor, or `supabase db push` with the CLI.

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'New conversation'
              check (char_length(title) between 1 and 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (char_length(content) between 1 and 20000),
  created_at       timestamptz not null default now()
);
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- memories (long-term, curated; NOT a copy of chat history)
-- ---------------------------------------------------------------------------
create table public.memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category    text not null default 'other'
              check (category in ('name', 'communication', 'interest', 'project',
                                  'goal', 'tool', 'preference', 'other')),
  content     text not null check (char_length(content) between 1 and 500),
  source      text not null default 'manual'
              check (source in ('manual', 'explicit', 'auto')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  fts         tsvector generated always as (to_tsvector('simple', content)) stored
);
create index memories_user_idx on public.memories (user_id, updated_at desc);
create index memories_fts_idx on public.memories using gin (fts);
-- The same fact is never stored twice (case-insensitive).
create unique index memories_user_content_uniq
  on public.memories (user_id, lower(content));

-- ---------------------------------------------------------------------------
-- user_settings (one row per user)
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name    text check (display_name is null or char_length(display_name) between 1 and 60),
  memory_enabled  boolean not null default true,
  sass_level      text not null default 'balanced'
                  check (sass_level in ('gentle', 'balanced', 'savage')),
  voice_uri       text check (voice_uri is null or char_length(voice_uri) <= 300),
  voice_rate      real not null default 1 check (voice_rate between 0.5 and 2),
  voice_pitch     real not null default 1 check (voice_pitch between 0 and 2),
  auto_speak      boolean not null default false,
  voice_muted     boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();
create trigger memories_touch before update on public.memories
  for each row execute function public.touch_updated_at();
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- A new message bumps its conversation to the top of the history list.
create function public.bump_conversation() returns trigger
language plpgsql as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.memories      enable row level security;
alter table public.user_settings enable row level security;

create policy conversations_select on public.conversations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy conversations_insert on public.conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy conversations_update on public.conversations
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy conversations_delete on public.conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy messages_select on public.messages
  for select to authenticated using ((select auth.uid()) = user_id);
-- A message may only be added to a conversation the user owns.
create policy messages_insert on public.messages
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
-- No update policy: messages are immutable. Deleting is used by "regenerate".
create policy messages_delete on public.messages
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy memories_select on public.memories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy memories_insert on public.memories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy memories_update on public.memories
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy memories_delete on public.memories
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy user_settings_select on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_insert on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_settings_update on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users only. The anonymous role gets nothing.
-- ---------------------------------------------------------------------------
revoke all on public.conversations, public.messages, public.memories, public.user_settings
  from anon, public;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, delete          on public.messages      to authenticated;
grant select, insert, update, delete on public.memories      to authenticated;
grant select, insert, update          on public.user_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Search and retrieval functions. SECURITY INVOKER (the default), so RLS
-- applies and each user can only ever search their own data.
-- ---------------------------------------------------------------------------

-- Conversation search over titles and message text. A plain substring match
-- (no LIKE wildcards), so user input can never act as a pattern.
create function public.search_conversations(query text, max_results int default 50)
returns setof public.conversations
language sql stable
as $$
  select c.*
  from public.conversations c
  where position(lower(query) in lower(c.title)) > 0
     or exists (
       select 1 from public.messages m
       where m.conversation_id = c.id
         and position(lower(query) in lower(m.content)) > 0
     )
  order by c.updated_at desc
  limit least(greatest(max_results, 1), 100);
$$;

-- Memory retrieval: the user's identity/communication memories always apply;
-- everything else must match words in the current message. `query_text` is a
-- tsquery string the app builds from sanitised words joined with `|`.
create function public.match_memories(query_text text, max_results int default 8)
returns setof public.memories
language plpgsql stable
as $$
declare
  q tsquery;
begin
  if query_text is not null and length(trim(query_text)) > 0 then
    q := to_tsquery('simple', query_text);
  end if;

  return query
    select m.*
    from public.memories m
    where m.category in ('name', 'communication')
       or (q is not null and m.fts @@ q)
    order by
      (m.category in ('name', 'communication')) desc,
      case when q is not null then ts_rank(m.fts, q) else 0 end desc,
      m.updated_at desc
    limit least(greatest(max_results, 1), 20);
end;
$$;

grant execute on function public.search_conversations(text, int) to authenticated;
grant execute on function public.match_memories(text, int) to authenticated;
revoke execute on function public.search_conversations(text, int) from anon, public;
revoke execute on function public.match_memories(text, int) from anon, public;
