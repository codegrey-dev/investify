import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    console.log(`Starting daily earnings calculation for ${today}`)

    // Get all active investments
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select('id, user_id, package_id, amount, daily_profit, created_at')
      .eq('status', 'active')

    if (investmentsError) {
      throw new Error(`Failed to fetch investments: ${investmentsError.message}`)
    }

    console.log(`Found ${investments.length} active investments`)

    let totalEarningsAdded = 0
    let totalUsersUpdated = 0

    for (const investment of investments) {
      // Check if earnings already calculated for today
      const { data: existingEarning } = await supabase
        .from('earnings')
        .select('id')
        .eq('investment_id', investment.id)
        .eq('calculated_date', today)
        .single()

      if (existingEarning) {
        console.log(`Earnings already calculated for investment ${investment.id} today`)
        continue
      }

      // Calculate daily earnings
      const percentStr = investment.daily_profit.replace(/[^0-9.]/g, '')
      const dailyPercent = parseFloat(percentStr) || 2
      const earningsPerDay = Number(investment.amount) * (dailyPercent / 100)

      // Generate package name from package_id
      const packageName = investment.package_id.charAt(0).toUpperCase() + investment.package_id.slice(1) + " Package"

      // Insert earnings record
      const { error: earningError } = await supabase
        .from('earnings')
        .insert({
          user_id: investment.user_id,
          investment_id: investment.id,
          package_id: investment.package_id,
          package_name: packageName,
          amount: earningsPerDay,
          calculated_date: today,
        })

      if (earningError) {
        console.error(`Failed to insert earnings for investment ${investment.id}: ${earningError.message}`)
        continue
      }

      // Update last earnings calculated date
      await supabase
        .from('profiles')
        .update({ last_earnings_calculated: today })
        .eq('id', investment.user_id)

      totalEarningsAdded += earningsPerDay
      totalUsersUpdated++

      console.log(`Added GH₵${earningsPerDay.toFixed(2)} earnings for investment ${investment.id}`)
    }

    console.log(`Calculation complete. Added GH₵${totalEarningsAdded.toFixed(2)} in earnings for ${totalUsersUpdated} users`)

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        totalEarningsAdded,
        totalUsersUpdated,
        investmentsProcessed: investments.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-daily-earnings:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
