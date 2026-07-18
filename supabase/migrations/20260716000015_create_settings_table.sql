-- Create app_settings table for configurable application settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read settings (public read access)
CREATE POLICY "Public read access to settings"
  ON app_settings FOR SELECT
  USING (true);

-- Policy: Only authenticated users can update settings
CREATE POLICY "Authenticated users can update settings"
  ON app_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Policy: Only authenticated users can insert settings
CREATE POLICY "Authenticated users can insert settings"
  ON app_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('deposit_fee_percent', '0', 'Transaction fee percentage for deposits'),
  ('withdraw_fee_percent', '10', 'Transaction fee percentage for withdrawals'),
  ('min_deposit', '10', 'Minimum deposit amount'),
  ('min_withdrawal', '30', 'Minimum withdrawal amount'),
  ('referral_initial_percent', '5', 'Initial referral bonus percentage'),
  ('referral_daily_percent', '1', 'Daily referral earnings percentage')
ON CONFLICT (key) DO NOTHING;

-- Create function to get setting value
CREATE OR REPLACE FUNCTION get_setting(setting_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN value FROM app_settings WHERE key = setting_key;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get numeric setting value
CREATE OR REPLACE FUNCTION get_numeric_setting(setting_key TEXT, default_value DECIMAL DEFAULT 0)
RETURNS DECIMAL AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT value INTO setting_value FROM app_settings WHERE key = setting_key;
  
  IF setting_value IS NULL THEN
    RETURN default_value;
  END IF;
  
  RETURN CAST(setting_value AS DECIMAL);
EXCEPTION WHEN OTHERS THEN
  RETURN default_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
