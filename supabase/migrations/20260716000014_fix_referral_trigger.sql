-- Fix referral trigger to prevent signup failures
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
