# Supabase setup (Plantea vNext)

This folder contains the SQL you should run in **Supabase → SQL Editor** to create the vNext database.

## Run order

1. `01_schema.sql`
2. `02_rls.sql`
3. `03_rpc.sql`

## How to run (Supabase Dashboard)

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Click **New query**.
4. Open `docs/supabase/01_schema.sql`, copy all, paste into the query editor, click **Run**.
5. Repeat for `02_rls.sql`, then `03_rpc.sql`.

## Notes

- If you see errors like "already exists", that’s usually OK (these scripts are written to be re-runnable).
- After running RLS, you’ll need to sign in via Supabase Auth to read/write most tables.

## Next step

After SQL is applied:
- enable Realtime on tables: `orders`, `order_events`, `notifications`
- create Storage buckets for plant images and payment proofs
