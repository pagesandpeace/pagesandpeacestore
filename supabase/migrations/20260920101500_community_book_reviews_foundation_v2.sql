alter table app_core.books
  add column if not exists open_library_work_key text,
  add column if not exists first_publish_year integer,
  add column if not exists description text,
  add column if not exists subjects text[] not null default '{}';

create unique index if not exists books_open_library_work_key_uidx
  on app_core.books (open_library_work_key)
  where open_library_work_key is not null;

create table app_core.book_editions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references app_core.books(id) on delete cascade,
  isbn10 text,
  isbn13 text,
  open_library_edition_key text,
  publisher text,
  published_year integer,
  language text,
  format text,
  cover_image_url text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index book_editions_isbn10_uidx on app_core.book_editions (isbn10) where isbn10 is not null;
create unique index book_editions_isbn13_uidx on app_core.book_editions (isbn13) where isbn13 is not null;
create unique index book_editions_ol_key_uidx on app_core.book_editions (open_library_edition_key) where open_library_edition_key is not null;
create index book_editions_book_idx on app_core.book_editions (book_id);

alter table app_core.book_reviews
  add column edition_id uuid references app_core.book_editions(id) on delete set null,
  add column share_slug text,
  add column edited_at timestamptz;

create unique index book_reviews_share_slug_uidx on app_core.book_reviews (share_slug) where share_slug is not null;

create table app_core.book_review_reactions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references app_core.book_reviews(id) on delete cascade,
  customer_id uuid not null references app_core.customers(auth_user_id) on delete cascade,
  reaction text not null check (reaction in ('helpful','love')),
  created_at timestamptz not null default now(),
  unique (review_id, customer_id, reaction)
);

create index book_review_reactions_review_idx on app_core.book_review_reactions (review_id);

create table app_core.book_review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references app_core.book_reviews(id) on delete cascade,
  customer_id uuid not null references app_core.customers(auth_user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index book_review_comments_review_idx on app_core.book_review_comments (review_id, created_at) where status='published';
create index book_review_comments_customer_idx on app_core.book_review_comments (customer_id, created_at desc);

create table app_core.book_reading_statuses (
  book_id uuid not null references app_core.books(id) on delete cascade,
  customer_id uuid not null references app_core.customers(auth_user_id) on delete cascade,
  status text not null check (status in ('want_to_read','reading','read')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (book_id, customer_id)
);

create index book_reading_statuses_customer_idx on app_core.book_reading_statuses (customer_id, status, updated_at desc);

create table app_core.book_community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_customer_id uuid not null references app_core.customers(auth_user_id) on delete cascade,
  review_id uuid references app_core.book_reviews(id) on delete cascade,
  comment_id uuid references app_core.book_review_comments(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','hate','sexual','privacy','copyright','other')),
  details text check (details is null or char_length(details) <= 1200),
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references app_core.admins(auth_user_id) on delete set null,
  check (((review_id is not null)::int + (comment_id is not null)::int) = 1)
);

create index book_community_reports_open_idx on app_core.book_community_reports (created_at) where status='open';

alter table app_core.book_editions enable row level security;
alter table app_core.book_review_reactions enable row level security;
alter table app_core.book_review_comments enable row level security;
alter table app_core.book_reading_statuses enable row level security;
alter table app_core.book_community_reports enable row level security;

revoke all on table app_core.book_editions from public, anon, authenticated;
revoke all on table app_core.book_review_reactions from public, anon, authenticated;
revoke all on table app_core.book_review_comments from public, anon, authenticated;
revoke all on table app_core.book_reading_statuses from public, anon, authenticated;
revoke all on table app_core.book_community_reports from public, anon, authenticated;

grant select, insert, update, delete on table app_core.book_editions to service_role;
grant select, insert, update, delete on table app_core.book_review_reactions to service_role;
grant select, insert, update, delete on table app_core.book_review_comments to service_role;
grant select, insert, update, delete on table app_core.book_reading_statuses to service_role;
grant select, insert, update, delete on table app_core.book_community_reports to service_role;
