# Warehouse Stock-In / Stock-Out Logger
Vite + TypeScript + three.js. Data is saved in the browser (localStorage).

    npm install
    npm run dev

## Creating users from StockLogger (Admin only)

The **Users → Add user** form creates a Supabase Auth account and its
matching `public.profiles` row through the existing `create-user` Edge Function.
The function validates the signed-in caller's token and confirms that their
profile has `role = 'admin'` and `active = true`. Cashiers cannot create users.
The service-role key is read only inside the Supabase Edge Function; **never**
add it to `VITE_*` variables, Vercel frontend environment settings, or Git.

### One-time Supabase deployment

1. From the project root, sign in and link the project with the Supabase CLI:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Deploy the function (its source is already at
   `supabase/functions/create-user/index.ts`):

   ```sh
   npx supabase functions deploy create-user --no-verify-jwt
   ```

   `supabase/config.toml` also sets `verify_jwt = false` for this function.
   This disables **gateway-only** JWT verification; the function itself
   explicitly validates the caller's access token through Supabase Auth and
   checks that the caller is an active administrator before taking any action.

3. In Supabase Dashboard → Edge Functions, confirm that `create-user` is
   deployed. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   to its Edge Functions environment. Do not copy the service-role key into
   frontend code.

4. Deploy the updated frontend to Vercel with your existing
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` settings. These are
   the normal frontend URL and publishable key, **not** the service-role key.

5. Sign in as an **active admin**, open **Users → Add user**, enter the new
   account details, and submit. The user should appear in both
   Supabase Authentication → Users and `public.profiles`, and can sign in using
   their email and initial password. An inactive account cannot access the app.

If the form says **"The create-user Edge Function has not been deployed"**, 
complete step 2 on the same Supabase project used by the website. If the
request is forbidden, check that the signed-in user has an active `admin`
profile. If `public.profiles` has a trigger or constraints specific to your
project, its schema must allow the fields written by `create-user`.

**Security:** Provide initial passwords privately to new staff; have them
change their passwords after first sign-in. User creation never signs the
current administrator out, and passwords are not stored in `profiles`.
