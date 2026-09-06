import { createClient } from '@supabase/supabase-js';   


const supabaseUrl =  'https://jnpwbdxtzepzymsobsdq.supabase.co'
const supabaseKey = 'sb_publishable_N93ZTOQmk25U74aQGfU1iA_9eCxQm9K'    
export const supabase = createClient(supabaseUrl, supabaseKey);    