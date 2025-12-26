import pool from './index';

const migrations = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_level INTEGER DEFAULT 0,
  subscription_expires_at TIMESTAMP,
  machine_limit INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Company relationship (for team members)
CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company_id)
);

-- Factories table
CREATE TABLE IF NOT EXISTS factories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'operational',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'healthy',
  health_score INTEGER DEFAULT 100,
  last_maintenance_at TIMESTAMP,
  next_maintenance_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Samples table (vibration recordings - raw data stored in S3)
CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  notes TEXT,
  duration_seconds DECIMAL(10, 2),
  sample_rate INTEGER DEFAULT 100,
  data_points INTEGER,
  metrics JSONB,
  s3_key VARCHAR(500),
  is_baseline BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Baselines table
CREATE TABLE IF NOT EXISTS baselines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES samples(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  notes TEXT,
  metrics JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES samples(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  description TEXT,
  recommendation TEXT,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table (PDF reports stored in S3)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  factory_id UUID REFERENCES factories(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  s3_key VARCHAR(500) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  period VARCHAR(50),
  report_type VARCHAR(50) DEFAULT 'maintenance',
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comparisons table (AI comparison PDFs stored in S3)
CREATE TABLE IF NOT EXISTS comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  baseline_sample_id UUID REFERENCES samples(id) ON DELETE SET NULL,
  current_sample_id UUID REFERENCES samples(id) ON DELETE SET NULL,
  severity VARCHAR(50),
  title VARCHAR(255),
  summary TEXT,
  s3_key VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance logs
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES users(id),
  type VARCHAR(100),
  description TEXT,
  parts_replaced TEXT,
  cost DECIMAL(10, 2),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  next_scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_samples_machine_id ON samples(machine_id);
CREATE INDEX IF NOT EXISTS idx_samples_recorded_at ON samples(recorded_at);
CREATE INDEX IF NOT EXISTS idx_samples_s3_key ON samples(s3_key);
CREATE INDEX IF NOT EXISTS idx_alerts_machine_id ON alerts(machine_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_machines_factory_id ON machines(factory_id);
CREATE INDEX IF NOT EXISTS idx_factories_company_id ON factories(company_id);
CREATE INDEX IF NOT EXISTS idx_baselines_machine_id ON baselines(machine_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_machine_id ON comparisons(machine_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON comparisons(created_at);
`;

// Function and trigger definitions need $$ which must be run separately
const functionAndTriggers = `
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $trigger$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$trigger$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_factories_updated_at ON factories;
CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON factories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_machines_updated_at ON machines;
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_baselines_updated_at ON baselines;
CREATE TRIGGER update_baselines_updated_at BEFORE UPDATE ON baselines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Add columns to existing tables (run separately with error handling)
const addColumns = [
  {
    check: "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_level'",
    add: "ALTER TABLE users ADD COLUMN subscription_level INTEGER DEFAULT 0"
  },
  {
    check: "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'machine_limit'",
    add: "ALTER TABLE users ADD COLUMN machine_limit INTEGER DEFAULT 0"
  }
];

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Run main migrations
    await pool.query(migrations);
    console.log('✅ Tables created');
    
    // Run function and triggers
    await pool.query(functionAndTriggers);
    console.log('✅ Functions and triggers created');
    
    // Add columns if they don't exist
    for (const col of addColumns) {
      try {
        const result = await pool.query(col.check);
        if (result.rows.length === 0) {
          await pool.query(col.add);
          console.log(`✅ Added column: ${col.add.split('ADD COLUMN ')[1]}`);
        }
      } catch (e) {
        // Column might already exist or other error, continue
        console.log(`ℹ️ Column check/add skipped: ${(e as Error).message}`);
      }
    }
    
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
