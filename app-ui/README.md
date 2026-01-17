# ChessBooker Coach Portal

Next.js + Supabase application for chess coaches to manage their booking availability and student requests.

## Local Development

1. **Install dependencies:**
   ```bash
   cd app-ui
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the contents of `supabase/schema.sql`
   - Go to Project Settings > API and copy your URL and anon key

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials.

4. **Configure Supabase Auth:**
   - In Supabase Dashboard > Authentication > URL Configuration
   - Add `http://localhost:3000/auth/callback` to Redirect URLs

5. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Deployment on Netlify

### Option 1: Via Netlify UI

1. Connect your GitHub repo to Netlify
2. Configure build settings:
   - **Base directory:** `app-ui`
   - **Build command:** `npm run build`
   - **Publish directory:** `app-ui/.next`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Install the Next.js plugin: `@netlify/plugin-nextjs`

### Option 2: Via Netlify CLI

```bash
cd app-ui
netlify init
netlify deploy --prod
```

### Custom Domain (app.chessbooker.com)

1. In Netlify Dashboard > Domain settings
2. Add custom domain: `app.chessbooker.com`
3. In your DNS provider, add:
   - CNAME record: `app` → `your-netlify-site.netlify.app`
4. Enable HTTPS in Netlify (automatic with Let's Encrypt)
5. Update Supabase Auth redirect URLs to include `https://app.chessbooker.com/auth/callback`

## Project Structure

```
app-ui/
├── src/
│   ├── app/
│   │   ├── app/              # Protected coach dashboard
│   │   │   ├── page.tsx      # Dashboard home
│   │   │   ├── settings/     # Profile & availability settings
│   │   │   └── requests/     # Booking requests management
│   │   ├── auth/callback/    # Magic link callback handler
│   │   ├── c/[slug]/         # Public booking page
│   │   ├── login/            # Login page
│   │   └── layout.tsx        # Root layout
│   ├── components/           # Shared components
│   └── lib/supabase/         # Supabase client utilities
├── supabase/
│   └── schema.sql            # Database schema + RLS policies
└── netlify.toml              # Netlify configuration
```
