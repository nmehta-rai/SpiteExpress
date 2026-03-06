import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ocytfuaypvbrryccqfca.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeXRmdWF5cHZicnJ5Y2NxZmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDk3MDAsImV4cCI6MjA4ODM4NTcwMH0.u4bKZZek5QBFAMSNhKQUExCmMaH8xSn6vrxwKw4b9Y8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
