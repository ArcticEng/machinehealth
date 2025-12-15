# Machine Monitoring App

A comprehensive mobile-first application for industrial machine health monitoring using smartphone accelerometers. Record vibration data, analyze machine conditions, and predict maintenance needs.

## Features

### Core Features
- **User Authentication**: Secure login/signup with JWT tokens
- **Company Structure**: Hierarchical organization (Companies → Factories → Machines)
- **Vibration Recording**: Real-time accelerometer data capture from mobile devices
- **Data Analysis**: RMS, Peak, Crest Factor, Kurtosis, Skewness calculations
- **Baseline Comparison**: Compare current measurements against healthy baselines
- **Alerts System**: Automatic alerts based on vibration thresholds
- **Trend Analysis**: Track machine health over time
- **AI Insights**: Predictive maintenance recommendations
- **CSV Export**: Download recorded data for external analysis
- **AWS S3 Integration**: Cloud storage for large datasets

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS 4 for styling
- Framer Motion for animations
- Recharts for data visualization
- Radix UI / shadcn components

**Backend:**
- Node.js with Express
- PostgreSQL database
- JWT authentication
- AWS S3 for file storage

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### 1. Frontend Setup

```bash
cd monitoringApp

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and set VITE_API_URL=http://localhost:3001/api

# Start development server
npm run dev
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your database credentials:
# DATABASE_URL=postgresql://username:password@localhost:5432/monitoring_app
# JWT_SECRET=your-secret-key

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

### 3. Database Setup

```sql
-- Create PostgreSQL database
CREATE DATABASE monitoring_app;
```

Then run migrations:
```bash
npm run db:migrate
npm run db:seed
```

**Demo Credentials:**
- Email: `demo@example.com`
- Password: `demo123`

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env)
```env
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/monitoring_app

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AWS (optional - for S3 storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=monitoring-app-samples

# CORS
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Companies
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Factories
- `GET /api/factories` - List factories
- `POST /api/factories` - Create factory
- `PUT /api/factories/:id` - Update factory
- `DELETE /api/factories/:id` - Delete factory

### Machines
- `GET /api/machines` - List machines
- `GET /api/machines/:id` - Get machine details
- `POST /api/machines` - Create machine
- `PUT /api/machines/:id` - Update machine
- `DELETE /api/machines/:id` - Delete machine

### Samples (Recordings)
- `GET /api/samples?machineId=xxx` - List samples for machine
- `GET /api/samples/:id` - Get sample with data
- `POST /api/samples` - Save new sample
- `DELETE /api/samples/:id` - Delete sample
- `GET /api/samples/:id/export` - Export as CSV

### Baselines
- `GET /api/baselines?machineId=xxx` - List baselines
- `GET /api/baselines/active/:machineId` - Get active baseline
- `POST /api/baselines/set-active` - Set sample as baseline

### Alerts
- `GET /api/alerts` - List alerts
- `PUT /api/alerts/:id/acknowledge` - Acknowledge alert
- `PUT /api/alerts/:id/resolve` - Resolve alert
- `GET /api/alerts/summary` - Get alert counts

### Analytics
- `GET /api/analytics/dashboard` - Dashboard overview
- `GET /api/analytics/health-trends` - Health trends over time
- `GET /api/analytics/compare/:sampleId` - Compare to baseline
- `GET /api/analytics/maintenance-due` - Machines needing maintenance

## Deployment

### Option 1: Vercel + Railway/Render

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Backend (Railway/Render):**
1. Push code to GitHub
2. Connect repository to Railway or Render
3. Set environment variables
4. Deploy

### Option 2: AWS Deployment

**Frontend (S3 + CloudFront):**
```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name
```

**Backend (EC2/ECS/Lambda):**
1. Build Docker image
2. Push to ECR
3. Deploy to ECS or use Elastic Beanstalk

### Option 3: Docker

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Mobile Usage

### Recording Vibrations
1. Select the machine you want to measure
2. Position your phone on the machine
3. Tap "Record" to start capturing
4. Tap "Stop & Save" when done
5. Review metrics and save or discard

### Tips for Accurate Readings
- Secure the phone firmly to the machine
- Record for at least 10-30 seconds
- Record baseline when machine is known to be healthy
- Use consistent phone placement for comparisons

## Vibration Analysis Metrics

| Metric | Description | Usage |
|--------|-------------|-------|
| RMS | Root Mean Square | Overall vibration level |
| Peak | Maximum absolute value | Impact detection |
| Crest Factor | Peak/RMS ratio | Impulsiveness indicator |
| Kurtosis | Distribution peakedness | Bearing defect detection |
| Skewness | Distribution asymmetry | Directional bias |
| Std Dev | Standard deviation | Variability measure |

## License

MIT License - See LICENSE file for details.

## Support

For issues and feature requests, please create a GitHub issue.
