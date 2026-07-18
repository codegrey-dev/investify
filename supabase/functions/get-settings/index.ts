import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all settings
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('key, value, description')

    if (error) {
      throw new Error(`Failed to fetch settings: ${error.message}`)
    }

    // Convert to key-value object
    const settingsMap: Record<string, string> = {}
    settings?.forEach(setting => {
      settingsMap[setting.key] = setting.value
    })

    return new Response(
      JSON.stringify({
        success: true,
        settings: settingsMap
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  } catch (error) {
    console.error('Error in get-settings:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
})
