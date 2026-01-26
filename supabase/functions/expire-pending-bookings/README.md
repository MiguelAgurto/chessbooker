# expire-pending-bookings Edge Function

This function expires pending booking requests that have passed their `expires_at` timestamp.

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# From the app-ui directory
supabase functions deploy expire-pending-bookings
```

### 2. Set up the Cron Schedule

In the Supabase Dashboard:

1. Go to **Database** > **Extensions** and enable `pg_cron` if not already enabled

2. Go to **SQL Editor** and run:

```sql
-- Schedule the edge function to run every 10 minutes
SELECT cron.schedule(
  'expire-pending-bookings',
  '*/10 * * * *',  -- Every 10 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-pending-bookings',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || 'YOUR_ANON_KEY',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your anon/public key

### 3. Verify the Schedule

```sql
-- Check scheduled jobs
SELECT * FROM cron.job;

-- Check job history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### 4. Manual Testing

You can manually invoke the function:

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-pending-bookings' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

## How It Works

1. The function calls the `expire_pending_booking_requests()` RPC
2. The RPC finds all pending bookings where `expires_at < NOW()`
3. Sets their status to 'expired' and clears `scheduled_start` / `scheduled_end`
4. Returns the count of expired bookings

This releases the held time slots back to availability automatically.
