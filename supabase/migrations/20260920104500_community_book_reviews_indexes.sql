create index if not exists book_reviews_edition_idx on app_core.book_reviews (edition_id) where edition_id is not null;
create index if not exists book_review_reactions_customer_idx on app_core.book_review_reactions (customer_id, created_at desc);
create index if not exists book_community_reports_reporter_idx on app_core.book_community_reports (reporter_customer_id, created_at desc);
create index if not exists book_community_reports_review_idx on app_core.book_community_reports (review_id) where review_id is not null;
create index if not exists book_community_reports_comment_idx on app_core.book_community_reports (comment_id) where comment_id is not null;
create index if not exists book_community_reports_reviewer_idx on app_core.book_community_reports (reviewed_by) where reviewed_by is not null;
create unique index if not exists book_community_reports_open_review_uidx on app_core.book_community_reports (reporter_customer_id, review_id) where review_id is not null and status='open';
create unique index if not exists book_community_reports_open_comment_uidx on app_core.book_community_reports (reporter_customer_id, comment_id) where comment_id is not null and status='open';
