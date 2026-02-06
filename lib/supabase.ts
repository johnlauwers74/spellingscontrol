
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdduodfdzmoqdfudykpv.supabase.co';
const supabaseKey = 'sb_publishable_e1aRYF06y1JlKoAmdw4sng_QJT5Tpwp';

export const supabase = createClient(supabaseUrl, supabaseKey);
