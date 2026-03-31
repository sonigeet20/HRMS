import { createBrowserClient } from '@supabase/ssr';

// Singleton — one client for the entire browser session.
// All hooks and providers share this instance so session state is consistent.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
