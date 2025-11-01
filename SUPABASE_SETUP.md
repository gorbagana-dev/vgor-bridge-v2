# 🚀 Supabase Database Setup Guide

Your app is running but the database isn't set up yet. Follow these steps to initialize your Supabase database.

## Step 1: Create a Supabase Project (2 minutes)

1. Go to **https://supabase.com/dashboard**
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in:
   - **Name**: `gorbagana-vbridge` (or any name you like)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait ~2 minutes for provisioning

## Step 2: Run the Database Schema (1 minute)

### Option A: Using SQL Editor (Recommended)

1. In your Supabase Dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** button
3. Open the file: `next-app/supabase-schema.sql` in your code editor
4. **Copy ALL contents** from that file
5. **Paste** into the Supabase SQL Editor
6. Click **"Run"** button (or press `Cmd/Ctrl + Enter`)
7. You should see: ✅ **Success. No rows returned**

### Option B: Using Table Editor

Skip this if you used Option A above. Table Editor is less reliable for complex schemas.

## Step 3: Verify Tables Were Created

1. In Supabase Dashboard, click **"Table Editor"** in left sidebar
2. You should see a table named: **`commitments`**
3. Click on it to see columns:
   - `id` (uuid)
   - `wallet_address` (text)
   - `amount` (numeric)
   - `transaction_signature` (text)
   - `created_at` (timestamptz)

## Step 4: Get Your API Credentials

1. In Supabase Dashboard, click **"Settings"** (gear icon) at bottom left
2. Click **"API"** in the settings menu
3. You'll see two important values:
   - **Project URL** (e.g., `https://abcxyz123.supabase.co`)
   - **Project API keys** → Copy the `anon` `public` key (long string starting with `eyJhbGc...`)

## Step 5: Update Your .env.local File

1. Open `next-app/.env.local` in your editor
2. Replace the placeholder values with your actual credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

3. Save the file

## Step 6: Restart Your Dev Server

1. In your terminal, press `Ctrl + C` to stop the server
2. Run again:
```bash
cd next-app
pnpm dev
```

3. Open http://localhost:3000
4. The errors should be gone! ✅

## ✅ How to Verify It's Working

1. **Connect your wallet** on the website
2. **Type an amount** in the commit field
3. You should see:
   - **Expected $gGOR** updating with calculated values
   - **Your Boost Pool Share** showing a percentage
   - No errors in the terminal

## 🔍 Troubleshooting

### Error: "Could not find the table 'commitment_stats'"

**Solution**: You didn't run the schema SQL yet. Go back to Step 2.

### Error: "Could not find the function get_user_stats"

**Solution**: The function wasn't created. Make sure you ran the ENTIRE schema file, not just parts of it.

### Error: "⚠️ Supabase environment variables are not set"

**Solution**: Your `.env.local` file doesn't have the correct values. Go back to Steps 4 & 5.

### Still seeing errors?

1. Check Supabase Dashboard → Logs to see what's happening
2. Verify your `.env.local` has the correct URL and key
3. Make sure you saved the `.env.local` file
4. Restart your dev server after changing `.env.local`

## 📊 Test the Database

After setup, you can test directly in Supabase:

1. Go to **SQL Editor** in Supabase
2. Run this query:
```sql
SELECT * FROM commitment_stats;
```

You should see:
```
total_commitments | unique_wallets | total_committed
0                | 0              | 0
```

3. Test the function:
```sql
SELECT * FROM get_user_stats('test_wallet');
```

You should see a row with all zeros (since no commitments yet).

## 🎉 Success!

Once setup is complete:
- No errors in the terminal
- Expected $gGOR calculates correctly
- You can make test commits
- Data saves to your Supabase database

---

**Need more help?** Check the main README.md or create an issue.

