import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('Missing SUPABASE_URL or SUPABASE_KEY environment variables. Using placeholders. Database operations will fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
