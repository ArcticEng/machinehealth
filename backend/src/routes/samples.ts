import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadSampleData, getSampleData, deleteSampleData, generatePresignedUrl } from '../services/s3';

const router = Router();

// Get samples for a machine (metadata only, no raw data)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { machineId, limit = 50, offset = 0 } = req.query;

    if (!machineId) {
      return res.status(400).json({ error: 'machineId is required' });
    }

    // Verify machine access
    const accessCheck = await query(
      `SELECT m.id FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE m.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [machineId, req.user!.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view samples for this machine' });
    }

    const result = await query(
      `SELECT s.id, s.machine_id, s.name, s.notes, s.duration_seconds, s.sample_rate,
              s.data_points, s.metrics, s.is_baseline, s.recorded_at, s.s3_key, s.created_at,
              u.first_name, u.last_name, u.email as recorded_by_email
       FROM samples s
       LEFT JOIN users u ON s.recorded_by = u.id
       WHERE s.machine_id = $1
       ORDER BY s.recorded_at DESC
       LIMIT $2 OFFSET $3`,
      [machineId, limit, offset]
    );

    const samples = result.rows.map(row => ({
      id: row.id,
      machineId: row.machine_id,
      name: row.name,
      notes: row.notes,
      durationSeconds: parseFloat(row.duration_seconds),
      sampleRate: row.sample_rate,
      dataPoints: row.data_points,
      metrics: row.metrics,
      isBaseline: row.is_baseline,
      recordedAt: row.recorded_at,
      recordedBy: row.first_name 
        ? `${row.first_name} ${row.last_name || ''}`.trim() 
        : row.recorded_by_email,
      hasRawData: !!row.s3_key,
      createdAt: row.created_at
    }));

    res.json(samples);
  } catch (error) {
    console.error('Get samples error:', error);
    res.status(500).json({ error: 'Failed to get samples' });
  }
});

// Get single sample with raw data from S3
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT s.*, m.name as machine_name, f.name as factory_name
       FROM samples s
       JOIN machines m ON s.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE s.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    const row = result.rows[0];

    // Get download URL for raw data if stored in S3
    let downloadUrl = null;
    if (row.s3_key) {
      try {
        downloadUrl = await generatePresignedUrl(row.s3_key);
      } catch (e) {
        console.error('Failed to generate presigned URL:', e);
      }
    }

    res.json({
      id: row.id,
      machineId: row.machine_id,
      machineName: row.machine_name,
      factoryName: row.factory_name,
      name: row.name,
      notes: row.notes,
      durationSeconds: parseFloat(row.duration_seconds),
      sampleRate: row.sample_rate,
      dataPoints: row.data_points,
      metrics: row.metrics,
      isBaseline: row.is_baseline,
      recordedAt: row.recorded_at,
      s3Key: row.s3_key,
      downloadUrl,
      createdAt: row.created_at
    });
  } catch (error) {
    console.error('Get sample error:', error);
    res.status(500).json({ error: 'Failed to get sample' });
  }
});

// Get raw data for a sample (fetches from S3)
router.get('/:id/rawdata', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT s.s3_key FROM samples s
       JOIN machines m ON s.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE s.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    const { s3_key } = result.rows[0];

    if (!s3_key) {
      return res.status(404).json({ error: 'Raw data not available for this sample' });
    }

    // Fetch raw data from S3
    const sampleData = await getSampleData(s3_key);
    
    res.json(sampleData);
  } catch (error) {
    console.error('Get raw data error:', error);
    res.status(500).json({ error: 'Failed to get raw data' });
  }
});

// Create sample (save recording) - stores raw data in S3
router.post(
  '/',
  authenticate,
  [
    body('machineId').isUUID(),
    body('name').notEmpty().trim(),
    body('notes').optional().trim(),
    body('durationSeconds').isFloat({ min: 0 }),
    body('sampleRate').optional().isInt({ min: 1 }),
    body('metrics').isObject(),
    body('rawData').isArray(),
    body('isBaseline').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        machineId, name, notes, durationSeconds, sampleRate = 100, 
        metrics, rawData, isBaseline = false 
      } = req.body;

      const userId = req.user!.id;

      // Get machine details for S3 path
      const machineResult = await query(
        `SELECT m.id, m.name as machine_name, 
                f.id as factory_id, f.name as factory_name,
                c.id as company_id, c.name as company_name, c.owner_id
         FROM machines m
         JOIN factories f ON m.factory_id = f.id
         JOIN companies c ON f.company_id = c.id
         WHERE m.id = $1
           AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
        [machineId, userId]
      );

      if (machineResult.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to add sample to this machine' });
      }

      const machine = machineResult.rows[0];

      // Always upload raw data to S3
      let s3Key = null;
      try {
        const uploadResult = await uploadSampleData({
          userId,
          companyId: machine.company_id,
          factoryId: machine.factory_id,
          machineId,
          sampleName: name,
          rawData,
          metrics,
          metadata: {
            machineName: machine.machine_name,
            factoryName: machine.factory_name,
            companyName: machine.company_name,
            durationSeconds: String(durationSeconds),
            sampleRate: String(sampleRate),
          }
        });
        s3Key = uploadResult.key;
        console.log('Sample data uploaded to S3:', s3Key);
      } catch (e) {
        console.error('S3 upload failed:', e);
        return res.status(500).json({ error: 'Failed to store sample data' });
      }

      // Save sample reference to database (no raw data stored in DB)
      const result = await query(
        `INSERT INTO samples (
          machine_id, recorded_by, name, notes, duration_seconds, 
          sample_rate, data_points, metrics, s3_key, is_baseline
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          machineId, userId, name, notes || null, durationSeconds,
          sampleRate, rawData.length, JSON.stringify(metrics), 
          s3Key, isBaseline
        ]
      );

      const sample = result.rows[0];

      // If marked as baseline, create/update baseline record
      if (isBaseline) {
        // Deactivate existing baselines
        await query(
          'UPDATE baselines SET is_active = false WHERE machine_id = $1',
          [machineId]
        );

        // Create new baseline
        await query(
          `INSERT INTO baselines (machine_id, sample_id, name, metrics, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [machineId, sample.id, name, JSON.stringify(metrics), userId]
        );
      }

      // Update machine health based on metrics
      const healthScore = calculateHealthScore(metrics);
      const status = healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'warning' : 'critical';
      
      await query(
        'UPDATE machines SET health_score = $1, status = $2 WHERE id = $3',
        [healthScore, status, machineId]
      );

      // Generate alerts if needed
      await checkAndCreateAlerts(machineId, sample.id, metrics, userId);

      res.status(201).json({
        id: sample.id,
        machineId: sample.machine_id,
        name: sample.name,
        notes: sample.notes,
        durationSeconds: parseFloat(sample.duration_seconds),
        sampleRate: sample.sample_rate,
        dataPoints: sample.data_points,
        metrics: sample.metrics,
        isBaseline: sample.is_baseline,
        recordedAt: sample.recorded_at,
        s3Key: sample.s3_key,
        createdAt: sample.created_at,
        healthScore,
        status
      });
    } catch (error) {
      console.error('Create sample error:', error);
      res.status(500).json({ error: 'Failed to create sample' });
    }
  }
);

// Delete sample (also deletes from S3)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check access and get S3 key
    const accessCheck = await query(
      `SELECT s.id, s.s3_key FROM samples s
       JOIN machines m ON s.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE s.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.id, req.user!.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this sample' });
    }

    const { s3_key } = accessCheck.rows[0];

    // Delete from S3
    if (s3_key) {
      try {
        await deleteSampleData(s3_key);
        console.log('Sample data deleted from S3:', s3_key);
      } catch (e) {
        console.error('Failed to delete from S3:', e);
        // Continue with DB deletion even if S3 fails
      }
    }

    // Delete from database
    await query('DELETE FROM samples WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Sample deleted successfully' });
  } catch (error) {
    console.error('Delete sample error:', error);
    res.status(500).json({ error: 'Failed to delete sample' });
  }
});

// Export sample as CSV (fetches from S3)
router.get('/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT s.name, s.s3_key FROM samples s
       JOIN machines m ON s.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE s.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    const { name, s3_key } = result.rows[0];

    if (!s3_key) {
      return res.status(404).json({ error: 'Raw data not available for export' });
    }

    // Fetch raw data from S3
    const sampleData = await getSampleData(s3_key);
    const rawData = sampleData.rawData || [];

    const csv = convertToCSV(rawData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/\s+/g, '_')}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export sample error:', error);
    res.status(500).json({ error: 'Failed to export sample' });
  }
});

// Helper functions
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => row[h]).join(','));
  
  return [headers.join(','), ...rows].join('\n');
}

function calculateHealthScore(metrics: any): number {
  const rmsAvg = ((metrics.rmsX || 0) + (metrics.rmsY || 0) + (metrics.rmsZ || 0)) / 3;
  const crestAvg = ((metrics.crestFactorX || 0) + (metrics.crestFactorY || 0) + (metrics.crestFactorZ || 0)) / 3;
  
  let score = 100;
  
  if (rmsAvg > 2.0) score -= 30;
  else if (rmsAvg > 1.0) score -= 15;
  else if (rmsAvg > 0.5) score -= 5;
  
  if (crestAvg > 4.0) score -= 20;
  else if (crestAvg > 3.0) score -= 10;
  else if (crestAvg > 2.0) score -= 5;
  
  const kurtosisAvg = ((metrics.kurtosisX || 0) + (metrics.kurtosisY || 0) + (metrics.kurtosisZ || 0)) / 3;
  if (kurtosisAvg > 5) score -= 15;
  else if (kurtosisAvg > 3) score -= 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function checkAndCreateAlerts(
  machineId: string, 
  sampleId: string, 
  metrics: any, 
  userId: string
): Promise<void> {
  const alerts: any[] = [];
  
  const rmsAvg = ((metrics.rmsX || 0) + (metrics.rmsY || 0) + (metrics.rmsZ || 0)) / 3;
  
  if (rmsAvg > 2.0) {
    alerts.push({
      type: 'critical',
      severity: 'high',
      title: 'Excessive Vibration Detected',
      description: `RMS vibration level (${rmsAvg.toFixed(3)}) exceeded critical threshold`,
      recommendation: 'Immediate inspection recommended. Check for bearing damage, misalignment, or loose components.'
    });
  } else if (rmsAvg > 1.0) {
    alerts.push({
      type: 'warning',
      severity: 'medium',
      title: 'Elevated Vibration Levels',
      description: `RMS vibration level (${rmsAvg.toFixed(3)}) is above normal range`,
      recommendation: 'Schedule inspection within the next week. Monitor for further degradation.'
    });
  }

  const crestAvg = ((metrics.crestFactorX || 0) + (metrics.crestFactorY || 0) + (metrics.crestFactorZ || 0)) / 3;
  
  if (crestAvg > 4.0) {
    alerts.push({
      type: 'warning',
      severity: 'medium',
      title: 'High Crest Factor Detected',
      description: `Crest factor (${crestAvg.toFixed(2)}) indicates potential impulsive events`,
      recommendation: 'Check for bearing defects or gear tooth damage. May indicate early stage failure.'
    });
  }

  for (const alert of alerts) {
    await query(
      `INSERT INTO alerts (machine_id, sample_id, type, severity, title, description, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [machineId, sampleId, alert.type, alert.severity, alert.title, alert.description, alert.recommendation]
    );
  }
}

export default router;
