import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadToS3, generatePresignedUrl } from '../services/s3';

const router = Router();

// Get samples for a machine
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
      `SELECT s.*, u.first_name, u.last_name, u.email as recorded_by_email
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
      s3Url: row.s3_url,
      createdAt: row.created_at
    }));

    res.json(samples);
  } catch (error) {
    console.error('Get samples error:', error);
    res.status(500).json({ error: 'Failed to get samples' });
  }
});

// Get single sample with raw data
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

    // If data is in S3, generate presigned URL
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
      rawData: row.raw_data,
      isBaseline: row.is_baseline,
      recordedAt: row.recorded_at,
      downloadUrl,
      createdAt: row.created_at
    });
  } catch (error) {
    console.error('Get sample error:', error);
    res.status(500).json({ error: 'Failed to get sample' });
  }
});

// Create sample (save recording)
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
        return res.status(403).json({ error: 'Not authorized to add sample to this machine' });
      }

      // For large datasets, upload to S3
      let s3Key = null;
      let s3Url = null;
      let storedRawData = rawData;

      if (rawData.length > 1000) {
        // Upload to S3 for large samples
        try {
          const csvData = convertToCSV(rawData);
          const fileName = `samples/${machineId}/${Date.now()}_${name.replace(/\s+/g, '_')}.csv`;
          const uploadResult = await uploadToS3(fileName, csvData, 'text/csv');
          s3Key = uploadResult.key;
          s3Url = uploadResult.url;
          storedRawData = null; // Don't store in DB
        } catch (e) {
          console.error('S3 upload failed, storing in DB:', e);
          // Fall back to storing in DB
        }
      }

      const result = await query(
        `INSERT INTO samples (
          machine_id, recorded_by, name, notes, duration_seconds, 
          sample_rate, data_points, metrics, raw_data, s3_key, s3_url, is_baseline
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          machineId, req.user!.id, name, notes || null, durationSeconds,
          sampleRate, rawData.length, JSON.stringify(metrics), 
          storedRawData ? JSON.stringify(storedRawData) : null,
          s3Key, s3Url, isBaseline
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
          [machineId, sample.id, name, JSON.stringify(metrics), req.user!.id]
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
      await checkAndCreateAlerts(machineId, sample.id, metrics, req.user!.id);

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
        s3Url: sample.s3_url,
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

// Delete sample
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check access
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

    // TODO: Delete from S3 if needed
    // if (accessCheck.rows[0].s3_key) {
    //   await deleteFromS3(accessCheck.rows[0].s3_key);
    // }

    await query('DELETE FROM samples WHERE id = $1', [req.params.id]);
    res.json({ message: 'Sample deleted successfully' });
  } catch (error) {
    console.error('Delete sample error:', error);
    res.status(500).json({ error: 'Failed to delete sample' });
  }
});

// Export sample as CSV
router.get('/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT s.* FROM samples s
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

    const sample = result.rows[0];
    const rawData = sample.raw_data || [];

    const csv = convertToCSV(rawData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${sample.name.replace(/\s+/g, '_')}.csv"`);
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
  // Simple health calculation based on RMS values and crest factors
  const rmsAvg = ((metrics.rmsX || 0) + (metrics.rmsY || 0) + (metrics.rmsZ || 0)) / 3;
  const crestAvg = ((metrics.crestFactorX || 0) + (metrics.crestFactorY || 0) + (metrics.crestFactorZ || 0)) / 3;
  
  // Lower RMS and crest factor = better health
  // These thresholds would be calibrated for real machinery
  let score = 100;
  
  if (rmsAvg > 2.0) score -= 30;
  else if (rmsAvg > 1.0) score -= 15;
  else if (rmsAvg > 0.5) score -= 5;
  
  if (crestAvg > 4.0) score -= 20;
  else if (crestAvg > 3.0) score -= 10;
  else if (crestAvg > 2.0) score -= 5;
  
  // Kurtosis check (high kurtosis can indicate impulsive events)
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
