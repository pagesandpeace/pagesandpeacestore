create table app_core.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 240),
  author text not null check (char_length(author) between 1 and 180),
  slug text not null unique check (char_length(slug) between 1 and 280),
  normalized_title text not null,
  normalized_author text not null,
  isbn text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_title, normalized_author)
);

create table app_core.book_reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references app_core.books(id) on delete restrict,
  customer_id uuid not null references app_core.customers(auth_user_id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 40 and 5000),
  image_url text,
  contains_spoilers boolean not null default false,
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, customer_id)
);

create index book_reviews_public_feed_idx on app_core.book_reviews (created_at desc) where status = 'published';
create index book_reviews_book_idx on app_core.book_reviews (book_id, created_at desc) where status = 'published';
create index book_reviews_customer_idx on app_core.book_reviews (customer_id, created_at desc);

alter table app_core.books enable row level security;
alter table app_core.book_reviews enable row level security;

revoke all on table app_core.books from public, anon, authenticated;
revoke all on table app_core.book_reviews from public, anon, authenticated;
grant select, insert, update, delete on table app_core.books to service_role;
grant select, insert, update, delete on table app_core.book_reviews to service_role;
