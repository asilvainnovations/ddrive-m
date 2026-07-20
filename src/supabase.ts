import { createClient } from '@supabase/supabase-js';

// Initialize database client
const supabaseUrl = 'https://tkmmgqqimvpqtipwbvrs.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjZmZTRlMTA1LTQxOGUtNDc0ZS05OGY0LTU1ZWFlNWQ1ZjVhNyJ9.eyJwcm9qZWN0SWQiOiJ0a21tZ3FxaW12cHF0aXB3YnZycyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2MTU2NjE5LCJleHAiOjIwOTE1MTY2MTksImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.LZqQK9VQXdHhLwsunfUrLp0A91wFAGufCR5YD8v4_9Y';

// Configure realtime with safer binary handling to prevent decode errors
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});

// DDRiVE-M brand assets
export const DDRIVE_LOGO_URL = 'https://tkmmgqqimvpqtipwbvrs.databasepad.com/storage/v1/object/public/image-assets/public/DDRiVE-M%20logo.png';

export { supabase };
