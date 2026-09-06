// import { createClient } from '@supabase/supabase-js';   


// const supabaseUrl =  'https://jnpwbdxtzepzymsobsdq.supabase.co'
// const supabaseKey = 'sb_publishable_N93ZTOQmk25U74aQGfU1iA_9eCxQm9K'    
// export const supabase = createClient(supabaseUrl, supabaseKey);    


import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jnpwbdxtzepzymsobsdq.supabase.co'
const supabaseKey = 'sb_publishable_N93ZTOQmk25U74aQGfU1iA_9eCxQm9K'

export const supabase =
  import.meta.env.PROD && supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null