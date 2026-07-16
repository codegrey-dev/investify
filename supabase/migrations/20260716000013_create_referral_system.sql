-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referrals table to track who referred whom
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Create referral_earnings table to track all referral earnings
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('initial', 'daily')),
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add referral_code column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_user_id ON referral_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_id ON referral_earnings(referral_id);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Users can view their own referral codes"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral codes"
  ON referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral codes"
  ON referral_codes FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view referrals they made or received"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals they made"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- RLS Policies for referral_earnings
CREATE POLICY "Users can view their own referral earnings"
  ON referral_earnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral earnings"
  ON referral_earnings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral code for new user
CREATE OR REPLACE FUNCTION create_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if referral_codes table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_codes') THEN
    -- Check if profiles table has referral_code column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
      INSERT INTO referral_codes (user_id, code)
      VALUES (NEW.id, generate_referral_code());
      
      UPDATE profiles 
      SET referral_code = (SELECT code FROM referral_codes WHERE user_id = NEW.id)
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail signup if referral code creation fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create referral code on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_referral_code();

-- Function to process referral on signup
CREATE OR REPLACE FUNCTION process_referral_on_signup(referral_code_input TEXT)
RETURNS UUID AS $$
DECLARE
  referral_code_record referral_codes%ROWTYPE;
  referrer_id UUID;
BEGIN
  IF referral_code_input IS NULL OR referral_code_input = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT * INTO referral_code_record 
  FROM referral_codes 
  WHERE code = UPPER(referral_code_input);
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Prevent self-referral
  IF referral_code_record.user_id = auth.uid() THEN
    RETURN NULL;
  END IF;
  
  -- Check if already referred
  IF EXISTS(SELECT 1 FROM referrals WHERE referred_id = auth.uid()) THEN
    RETURN NULL;
  END IF;
  
  -- Create referral relationship
  INSERT INTO referrals (referrer_id, referred_id, referral_code_id)
  VALUES (referral_code_record.user_id, auth.uid(), referral_code_record.id);
  
  RETURN referral_code_record.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily referral interest
CREATE OR REPLACE FUNCTION calculate_daily_referral_interest()
RETURNS VOID AS $$
DECLARE
  referral_record RECORD;
  investment_record RECORD;
  daily_rate DECIMAL := 0.01; -- 1% daily referral interest
BEGIN
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
      -- Calculate daily interest (1% of investment amount)
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

-- Function to grant initial referral bonus
CREATE OR REPLACE FUNCTION grant_referral_initial_bonus(referral_id UUID, investment_id UUID, investment_amount DECIMAL)
RETURNS VOID AS $$
DECLARE
  referral_record RECORD;
  initial_rate DECIMAL := 0.05; -- 5% initial referral bonus
BEGIN
  SELECT * INTO referral_record 
  FROM referrals 
  WHERE id = referral_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Grant initial bonus (5% of investment amount)
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
