# Daily Checklist + Voice Memos

A production-ready web app to manage daily tasks with AI-powered voice transcription and task extraction.

## Features
- Daily Checklist grouped by date
- Manual Task Management (Add/Edit/Complete)
- Voice Memos (Record/Upload)
- AI Transcription (OpenAI Whisper)
- AI Task Extraction (OpenAI GPT-4o)
- Supabase Authentication & Storage
- Row Level Security (RLS)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Supabase Setup**
   - Create a new Supabase project.
   - Go to the SQL Editor and run the contents of `supabase/schema.sql`.
   - Create a Storage Bucket named `voice-memos`.
   - (Optional) Configure Google/GitHub auth providers if desired, or use Email/Password (enabled by default).

3. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your keys:
     - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon / Public Key
     - `OPENAI_API_KEY`: OpenAI API Key

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- OpenAI (Whisper, GPT-4o)
