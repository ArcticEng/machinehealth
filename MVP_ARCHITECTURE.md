# Monitoring App MVP Architecture

## Overview
A mobile-first vibration monitoring application that uses smartphone accelerometers to measure machine vibrations, analyze data, and provide predictive maintenance insights.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React Native Web)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Login     │  │   Record    │  │   Compare   │  │   Reports   │         │
│  │   SignUp    │  │   Sample    │  │   Baseline  │  │   AI        │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│                              │                                                │
│                    Device Accelerometer API                                   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Node.js/Express)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Auth      │  │   Samples   │  │   Assets    │  │   Analysis  │         │
│  │   Service   │  │   Service   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │    AWS S3       │  │   (Future)      │
│   Database      │  │   CSV Storage   │  │   ML Service    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Database Schema

### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user', -- admin, manager, user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Companies
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User-Company Membership
```sql
CREATE TABLE user_companies (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
    PRIMARY KEY (user_id, company_id)
);
```

### Factories/Locations
```sql
CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    address TEXT,
    status VARCHAR(50) DEFAULT 'operational',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Machines
```sql
CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    installation_date DATE,
    status VARCHAR(50) DEFAULT 'healthy', -- healthy, warning, critical, maintenance
    health_score INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Samples (Vibration Recordings)
```sql
CREATE TABLE samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    notes TEXT,
    duration DECIMAL(10, 2), -- in seconds
    sample_rate INTEGER, -- Hz
    is_baseline BOOLEAN DEFAULT FALSE,
    s3_key VARCHAR(500), -- CSV file location in S3
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sample Metrics (Computed statistics)
```sql
CREATE TABLE sample_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    
    -- RMS values
    rms_x DECIMAL(10, 6),
    rms_y DECIMAL(10, 6),
    rms_z DECIMAL(10, 6),
    
    -- Peak values
    peak_x DECIMAL(10, 6),
    peak_y DECIMAL(10, 6),
    peak_z DECIMAL(10, 6),
    
    -- Crest factor
    crest_factor_x DECIMAL(10, 6),
    crest_factor_y DECIMAL(10, 6),
    crest_factor_z DECIMAL(10, 6),
    
    -- Kurtosis
    kurtosis_x DECIMAL(10, 6),
    kurtosis_y DECIMAL(10, 6),
    kurtosis_z DECIMAL(10, 6),
    
    -- Skewness
    skewness_x DECIMAL(10, 6),
    skewness_y DECIMAL(10, 6),
    skewness_z DECIMAL(10, 6),
    
    -- Standard deviation
    std_dev_x DECIMAL(10, 6),
    std_dev_y DECIMAL(10, 6),
    std_dev_z DECIMAL(10, 6),
    
    -- Overall health score computed from this sample
    computed_health_score INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Alerts
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES samples(id),
    type VARCHAR(50) NOT NULL, -- critical, warning, info
    severity VARCHAR(50) NOT NULL, -- high, medium, low
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Baselines
```sql
CREATE TABLE baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout
- POST `/api/auth/forgot-password` - Password reset request
- POST `/api/auth/reset-password` - Password reset
- GET `/api/auth/me` - Get current user

### Companies
- GET `/api/companies` - List user's companies
- POST `/api/companies` - Create company
- GET `/api/companies/:id` - Get company details
- PUT `/api/companies/:id` - Update company
- DELETE `/api/companies/:id` - Delete company

### Factories
- GET `/api/companies/:companyId/factories` - List factories
- POST `/api/companies/:companyId/factories` - Create factory
- GET `/api/factories/:id` - Get factory details
- PUT `/api/factories/:id` - Update factory
- DELETE `/api/factories/:id` - Delete factory

### Machines
- GET `/api/factories/:factoryId/machines` - List machines
- POST `/api/factories/:factoryId/machines` - Create machine
- GET `/api/machines/:id` - Get machine details
- PUT `/api/machines/:id` - Update machine
- DELETE `/api/machines/:id` - Delete machine
- GET `/api/machines/:id/health` - Get machine health history

### Samples
- GET `/api/machines/:machineId/samples` - List samples for machine
- POST `/api/machines/:machineId/samples` - Create/upload sample
- GET `/api/samples/:id` - Get sample details with metrics
- GET `/api/samples/:id/data` - Get raw CSV data from S3
- DELETE `/api/samples/:id` - Delete sample
- POST `/api/samples/:id/set-baseline` - Set as machine baseline

### Analysis
- GET `/api/machines/:id/compare` - Compare current vs baseline
- GET `/api/machines/:id/trends` - Get trend data over time
- GET `/api/analysis/alerts` - Get all alerts
- POST `/api/analysis/alerts/:id/resolve` - Resolve an alert

### Reports
- GET `/api/reports/health-summary` - Overall health summary
- GET `/api/reports/maintenance` - Maintenance recommendations
- GET `/api/reports/export` - Export data as PDF/CSV

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Recharts (charts)
- Framer Motion (animations)
- Web DeviceMotion API (accelerometer)
- Axios (HTTP client)
- React Context + useReducer (state management)

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL (database)
- Prisma (ORM)
- JWT (authentication)
- bcrypt (password hashing)
- AWS SDK (S3 integration)
- Multer (file uploads)

### Infrastructure
- AWS S3 (CSV storage)
- AWS RDS or local PostgreSQL
- Docker (containerization)
- Vercel/Railway (deployment options)

## Key Features

### 1. Real Accelerometer Recording
- Uses Web DeviceMotion API
- Configurable sample rate (10-100 Hz)
- Records X, Y, Z axis data
- Real-time visualization during recording

### 2. Asset Hierarchy
- Company → Factory → Machine structure
- Role-based access control
- Health rollup from machines to factory to company

### 3. Sample Management
- Save recordings with metadata
- Upload to AWS S3 as CSV
- Set baselines for comparison
- View historical samples

### 4. Analysis Tools
- Compare samples to baseline
- Temporal comparison (yesterday vs today)
- Trend analysis over time
- Automatic alert generation

### 5. Health Scoring
- Computed from vibration metrics
- Weighted algorithm considering:
  - RMS deviation from baseline
  - Crest factor changes
  - Kurtosis (bearing wear indicator)
  - Trend direction

### 6. Alerts & Notifications
- Automatic alerts when thresholds exceeded
- Priority levels (critical, warning, info)
- Resolution tracking

## Development Phases

### Phase 1: MVP Core (Current)
- [x] Frontend UI components
- [ ] Backend API setup
- [ ] Database schema
- [ ] Authentication
- [ ] Basic CRUD operations

### Phase 2: Recording & Storage
- [ ] Real accelerometer integration
- [ ] AWS S3 upload
- [ ] Sample metrics computation
- [ ] Baseline management

### Phase 3: Analysis
- [ ] Comparison algorithms
- [ ] Health score computation
- [ ] Alert generation
- [ ] Trend tracking

### Phase 4: Reports & AI
- [ ] Report generation
- [ ] Data export
- [ ] AI insights (future)
- [ ] Predictive maintenance (future)

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/monitoring_app

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AWS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=monitoring-app-samples

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```
