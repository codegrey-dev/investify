-- Update calculate_daily_referral_interest to use settings table
CREATE OR REPLACE FUNCTION calculate_daily_referral_interest()
RETURNS VOID AS $$
DECLARE
  referral_record RECORD;
  investment_record RECORD;
  daily_rate DECIMAL;
BEGIN
  -- Get daily referral rate from settings
  daily_rate := get_numeric_setting('referral_daily_percent', 1) / 100;
  
  FOR referral_record IN 
    SELECT r.id, r.referrer_id, r.referred_id 
    FROM referrals r
  LOOP
    -- Get all active investments for the referred user
    FOR investment_record IN 
      SELECT id, amount 
      FROM investments 
      WHERE user_id = referral_record.referred_id 
      AND status = 'active'
    LOOP
      -- Calculate daily interest
      INSERT INTO referral_earnings (user_id, referral_id, amount, type, investment_id)
      VALUES (
        referral_record.referrer_id,
        referral_record.id,
        investment_record.amount * daily_rate,
        'daily',
        investment_record.id
      );
      
      -- Update referrer's balance
      UPDATE profiles
      SET balance = balance + (investment_record.amount * daily_rate)
      WHERE id = referral_record.referrer_id;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update grant_referral_initial_bonus to use settings table
CREATE OR REPLACE FUNCTION grant_referral_initial_bonus(referral_id UUID, investment_id UUID, investment_amount DECIMAL)
RETURNS VOID AS $$
DECLARE
  referral_record RECORD;
  initial_rate DECIMAL;
BEGIN
  -- Get initial referral rate from settings
  initial_rate := get_numeric_setting('referral_initial_percent', 5) / 100;
  
  SELECT * INTO referral_record 
  FROM referrals 
  WHERE id = referral_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Grant initial bonus
  INSERT INTO referral_earnings (user_id, referral_id, amount, type, investment_id)
  VALUES (
    referral_record.referrer_id,
    referral_id,
    investment_amount * initial_rate,
    'initial',
    investment_id
  );
  
  -- Update referrer's balance
  UPDATE profiles
  SET balance = balance + (investment_amount * initial_rate)
  WHERE id = referral_record.referrer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
