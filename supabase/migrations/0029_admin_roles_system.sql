-- Migration: Admin Roles System
-- Description: Multi-level role system with permissions
-- Created: 2024-11-01

-- Step 1: Create admin_role enum with all levels
CREATE TYPE admin_role AS ENUM (
  'super_admin',  -- Full access, manage other admins
  'admin',        -- Full operational access
  'manager',      -- Manage applications + content
  'operator',     -- Process applications only
  'support',      -- View + comment only
  'viewer',       -- Read-only access
  'user'          -- Regular user (non-admin)
);

-- Step 2: Backup existing role values
ALTER TABLE profiles ADD COLUMN role_backup TEXT;
UPDATE profiles SET role_backup = role;

-- Step 3: Drop the old role column and recreate with new enum
ALTER TABLE profiles DROP COLUMN role;
ALTER TABLE profiles ADD COLUMN role admin_role DEFAULT 'user' NOT NULL;

-- Step 4: Restore roles with migration
UPDATE profiles
SET role = CASE
  WHEN role_backup = 'admin' THEN 'super_admin'::admin_role
  ELSE 'user'::admin_role
END;

-- Step 5: Clean up backup
ALTER TABLE profiles DROP COLUMN role_backup;

-- Step 6: Create permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role admin_role NOT NULL UNIQUE,
  resources JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Insert default permissions
INSERT INTO admin_permissions (role, resources) VALUES
  ('super_admin', '{
    "applications": ["view", "create", "edit", "delete", "assign", "approve", "refund"],
    "users": ["view", "create", "edit", "delete", "ban", "change_role"],
    "content": ["view", "create", "edit", "delete", "publish"],
    "settings": ["view", "edit"],
    "reports": ["view", "export"],
    "audit": ["view"],
    "staff": ["view", "manage"]
  }'),
  ('admin', '{
    "applications": ["view", "create", "edit", "assign", "approve", "refund"],
    "users": ["view", "edit", "ban"],
    "content": ["view", "create", "edit", "delete", "publish"],
    "settings": ["view", "edit"],
    "reports": ["view", "export"],
    "audit": ["view"],
    "staff": ["view"]
  }'),
  ('manager', '{
    "applications": ["view", "edit", "assign", "approve"],
    "users": ["view"],
    "content": ["view", "create", "edit", "publish"],
    "settings": ["view"],
    "reports": ["view", "export"],
    "audit": ["view"],
    "staff": ["view"]
  }'),
  ('operator', '{
    "applications": ["view", "edit", "assign"],
    "users": [],
    "content": ["view"],
    "settings": [],
    "reports": ["view"],
    "audit": [],
    "staff": []
  }'),
  ('support', '{
    "applications": ["view"],
    "users": ["view"],
    "content": ["view"],
    "settings": [],
    "reports": ["view"],
    "audit": [],
    "staff": []
  }'),
  ('viewer', '{
    "applications": ["view"],
    "users": [],
    "content": ["view"],
    "settings": [],
    "reports": ["view"],
    "audit": [],
    "staff": []
  }'),
  ('user', '{
    "applications": [],
    "users": [],
    "content": [],
    "settings": [],
    "reports": [],
    "audit": [],
    "staff": []
  }');

-- Step 8: Create staff_profiles table for admin-specific data
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  department TEXT,
  specialty TEXT[], -- e.g., ['schengen', 'asia']
  max_applications INTEGER DEFAULT 10,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  hired_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Create indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_staff_profiles_active ON staff_profiles(active);
CREATE INDEX idx_staff_profiles_specialty ON staff_profiles USING GIN(specialty);

-- Step 10: Add updated_at trigger for staff_profiles
CREATE OR REPLACE FUNCTION update_staff_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_profiles_updated_at();

-- Step 11: Create function to check permissions
CREATE OR REPLACE FUNCTION has_admin_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role admin_role;
  permissions JSONB;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE id = p_user_id;

  -- If not an admin role, return false
  IF user_role IN ('user') THEN
    RETURN FALSE;
  END IF;

  -- Super admin has all permissions
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Get permissions for role
  SELECT resources INTO permissions
  FROM admin_permissions
  WHERE role = user_role;

  -- Check if action exists in resource permissions
  RETURN (permissions->p_resource) @> to_jsonb(ARRAY[p_action]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Add RLS policies for staff_profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_profiles_select ON staff_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY staff_profiles_insert ON staff_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY staff_profiles_update ON staff_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY staff_profiles_delete ON staff_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Step 13: Add comment
COMMENT ON TABLE admin_permissions IS 'Role-based permissions for admin users';
COMMENT ON TABLE staff_profiles IS 'Extended profile data for staff members';
COMMENT ON FUNCTION has_admin_permission IS 'Check if user has specific permission';
