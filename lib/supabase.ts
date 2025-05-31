import { createClient } from "@supabase/supabase-js"

// Create a Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-url.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key",
)
