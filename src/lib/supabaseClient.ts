import { createClient } from '@supabase/supabase-js';

// The anon key is meant to be public (it's embedded in the client bundle);
// access control is enforced by the table's row-level security policies,
// not by keeping this secret.
const SUPABASE_URL = 'https://kuwopbkqsoptmqakeczk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1d29wYmtxc29wdG1xYWtlY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzQ0NzgsImV4cCI6MjA5ODY1MDQ3OH0.vssk7lgPijelcby87RkIbmIzGYzjNuG0eqPU66tuhgc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
