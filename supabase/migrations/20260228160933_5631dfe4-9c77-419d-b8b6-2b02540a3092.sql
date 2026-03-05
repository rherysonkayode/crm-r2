
-- Add new role values to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'imobiliaria_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'imobiliaria_corretor';

-- Add billing-ready columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Update the signup trigger to handle role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  user_role app_role;
  account_type TEXT;
BEGIN
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'corretor');
  
  IF account_type = 'imobiliaria' THEN
    user_role := 'imobiliaria_admin';
  ELSE
    user_role := 'corretor';
  END IF;

  INSERT INTO public.companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'))
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, full_name, role)
  VALUES (NEW.id, new_company_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), user_role);

  RETURN NEW;
END;
$$;
