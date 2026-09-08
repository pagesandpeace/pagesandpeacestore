# Simple Core Rebuild

This branch builds the new event-commerce application against the isolated `app_core` schema in the staging Supabase project.

The staging Data API exposes `app_core` for server access only; browser roles have no grants and RLS remains enabled.

Production remains on `main`.
