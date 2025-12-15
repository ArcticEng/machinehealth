import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface VibrationMetrics {
  rmsX?: number;
  rmsY?: number;
  rmsZ?: number;
  peakX?: number;
  peakY?: number;
  peakZ?: number;
  crestFactorX?: number;
  crestFactorY?: number;
  crestFactorZ?: number;
  kurtosisX?: number;
  kurtosisY?: number;
  kurtosisZ?: number;
}

interface AnalysisResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  findings: string[];
  possibleCauses: string[];
  recommendations: string[];
  predictedTimeToFailure?: string;
  confidenceScore: number;
  generatedAt: string;
}

interface ReportResult {
  title: string;
  executiveSummary: string;
  healthOverview: string;
  criticalFindings: string[];
  recommendations: string[];
  maintenancePriorities: string[];
  predictiveInsights: string;
  generatedAt: string;
}

export async function analyzeVibrationComparison(
  machineName: string,
  machineType: string,
  baselineMetrics: VibrationMetrics,
  currentMetrics: VibrationMetrics,
  historicalContext?: string
): Promise<AnalysisResult> {
  // Calculate deviations
  const deviations = {
    rmsX: calculateDeviation(currentMetrics.rmsX, baselineMetrics.rmsX),
    rmsY: calculateDeviation(currentMetrics.rmsY, baselineMetrics.rmsY),
    rmsZ: calculateDeviation(currentMetrics.rmsZ, baselineMetrics.rmsZ),
    peakX: calculateDeviation(currentMetrics.peakX, baselineMetrics.peakX),
    peakY: calculateDeviation(currentMetrics.peakY, baselineMetrics.peakY),
    peakZ: calculateDeviation(currentMetrics.peakZ, baselineMetrics.peakZ),
  };

  const prompt = `You are an expert vibration analyst and predictive maintenance specialist. Analyze the following vibration data comparison for a machine and provide actionable insights.

## Machine Information
- Name: ${machineName}
- Type: ${machineType || 'Industrial Equipment'}
${historicalContext ? `- Historical Context: ${historicalContext}` : ''}

## Baseline Vibration Metrics (healthy reference)
- RMS X-axis: ${baselineMetrics.rmsX?.toFixed(4) || 'N/A'} g
- RMS Y-axis: ${baselineMetrics.rmsY?.toFixed(4) || 'N/A'} g
- RMS Z-axis: ${baselineMetrics.rmsZ?.toFixed(4) || 'N/A'} g
- Peak X-axis: ${baselineMetrics.peakX?.toFixed(4) || 'N/A'} g
- Peak Y-axis: ${baselineMetrics.peakY?.toFixed(4) || 'N/A'} g
- Peak Z-axis: ${baselineMetrics.peakZ?.toFixed(4) || 'N/A'} g
${baselineMetrics.kurtosisX ? `- Kurtosis X: ${baselineMetrics.kurtosisX.toFixed(2)}` : ''}
${baselineMetrics.crestFactorX ? `- Crest Factor X: ${baselineMetrics.crestFactorX.toFixed(2)}` : ''}

## Current Vibration Metrics
- RMS X-axis: ${currentMetrics.rmsX?.toFixed(4) || 'N/A'} g (${deviations.rmsX !== null ? `${deviations.rmsX > 0 ? '+' : ''}${deviations.rmsX.toFixed(1)}%` : 'N/A'} from baseline)
- RMS Y-axis: ${currentMetrics.rmsY?.toFixed(4) || 'N/A'} g (${deviations.rmsY !== null ? `${deviations.rmsY > 0 ? '+' : ''}${deviations.rmsY.toFixed(1)}%` : 'N/A'} from baseline)
- RMS Z-axis: ${currentMetrics.rmsZ?.toFixed(4) || 'N/A'} g (${deviations.rmsZ !== null ? `${deviations.rmsZ > 0 ? '+' : ''}${deviations.rmsZ.toFixed(1)}%` : 'N/A'} from baseline)
- Peak X-axis: ${currentMetrics.peakX?.toFixed(4) || 'N/A'} g (${deviations.peakX !== null ? `${deviations.peakX > 0 ? '+' : ''}${deviations.peakX.toFixed(1)}%` : 'N/A'} from baseline)
- Peak Y-axis: ${currentMetrics.peakY?.toFixed(4) || 'N/A'} g (${deviations.peakY !== null ? `${deviations.peakY > 0 ? '+' : ''}${deviations.peakY.toFixed(1)}%` : 'N/A'} from baseline)
- Peak Z-axis: ${currentMetrics.peakZ?.toFixed(4) || 'N/A'} g (${deviations.peakZ !== null ? `${deviations.peakZ > 0 ? '+' : ''}${deviations.peakZ.toFixed(1)}%` : 'N/A'} from baseline)
${currentMetrics.kurtosisX ? `- Kurtosis X: ${currentMetrics.kurtosisX.toFixed(2)}` : ''}
${currentMetrics.crestFactorX ? `- Crest Factor X: ${currentMetrics.crestFactorX.toFixed(2)}` : ''}

Please provide your analysis in the following JSON format only (no other text):
{
  "severity": "low|medium|high|critical",
  "title": "Brief title summarizing the condition",
  "summary": "2-3 sentence executive summary",
  "findings": ["Finding 1", "Finding 2", "Finding 3"],
  "possibleCauses": ["Cause 1", "Cause 2", "Cause 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3", "Recommendation 4"],
  "predictedTimeToFailure": "Estimated time range if applicable, or null",
  "confidenceScore": 0.0-1.0
}

Guidelines for severity:
- low: <15% deviation, normal wear
- medium: 15-40% deviation, monitor closely
- high: 40-70% deviation, schedule maintenance
- critical: >70% deviation, immediate action required

Consider:
1. Which axis shows the most concern and what that indicates
2. Whether the pattern suggests bearing wear, imbalance, misalignment, or looseness
3. High kurtosis (>4) indicates impacting, high crest factor (>6) indicates peaks/transients
4. Practical maintenance recommendations specific to the likely fault type`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content
    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      ...analysis,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Claude API error:', error);
    // Return fallback analysis
    return generateFallbackAnalysis(deviations);
  }
}

export async function generateMaintenanceReport(
  machines: Array<{
    name: string;
    type?: string;
    healthScore: number;
    status: string;
    factoryName: string;
    lastMaintenance?: string;
    recentAlerts?: number;
  }>,
  alerts: Array<{
    severity: string;
    machineName: string;
    description: string;
  }>,
  period: string,
  companyName?: string
): Promise<ReportResult> {
  const criticalMachines = machines.filter(m => m.healthScore < 70);
  const warningMachines = machines.filter(m => m.healthScore >= 70 && m.healthScore < 85);
  const healthyMachines = machines.filter(m => m.healthScore >= 85);
  const avgHealth = machines.length > 0 
    ? machines.reduce((sum, m) => sum + m.healthScore, 0) / machines.length 
    : 100;

  const prompt = `You are a predictive maintenance expert generating a comprehensive equipment health report. Analyze the following data and provide actionable insights.

## Report Scope
- Company: ${companyName || 'All Companies'}
- Period: ${period}
- Total Machines: ${machines.length}
- Average Health Score: ${avgHealth.toFixed(1)}%

## Machine Health Distribution
- Healthy (≥85%): ${healthyMachines.length} machines
- Warning (70-84%): ${warningMachines.length} machines
- Critical (<70%): ${criticalMachines.length} machines

## Critical Machines Requiring Attention
${criticalMachines.length > 0 ? criticalMachines.map(m => 
  `- ${m.name} (${m.factoryName}): ${m.healthScore}% health, Status: ${m.status}`
).join('\n') : 'None'}

## Warning Machines to Monitor
${warningMachines.length > 0 ? warningMachines.map(m => 
  `- ${m.name} (${m.factoryName}): ${m.healthScore}% health`
).join('\n') : 'None'}

## Recent Alerts Summary
${alerts.length > 0 ? alerts.slice(0, 10).map(a => 
  `- [${a.severity.toUpperCase()}] ${a.machineName}: ${a.description}`
).join('\n') : 'No recent alerts'}

## Full Machine List
${machines.map(m => `- ${m.name}: ${m.healthScore}% (${m.status})`).join('\n')}

Generate a comprehensive maintenance report in the following JSON format only (no other text):
{
  "executiveSummary": "3-4 sentence high-level summary for management",
  "healthOverview": "Detailed paragraph about overall fleet health",
  "criticalFindings": ["Critical finding 1", "Critical finding 2"],
  "recommendations": ["Prioritized recommendation 1", "Recommendation 2", "Recommendation 3", "Recommendation 4", "Recommendation 5"],
  "maintenancePriorities": ["Priority 1 with timeline", "Priority 2 with timeline", "Priority 3 with timeline"],
  "predictiveInsights": "Paragraph about predicted issues and preventive actions"
}

Focus on:
1. Immediate risks and required actions
2. Cost-effective maintenance scheduling
3. Patterns across machines that might indicate systemic issues
4. Specific, actionable recommendations with timelines
5. Risk assessment and business impact`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const report = JSON.parse(jsonMatch[0]);
    
    return {
      title: `Machine Health Report - ${period}`,
      ...report,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return generateFallbackReport(machines, avgHealth, criticalMachines.length, period);
  }
}

export async function interpretVibrationPattern(
  rawData: Array<{ x: number; y: number; z: number; timestamp: number }>,
  machineType: string
): Promise<{ pattern: string; interpretation: string; concerns: string[] }> {
  // Calculate statistics from raw data
  const stats = calculateRawDataStats(rawData);
  
  const prompt = `As a vibration analysis expert, interpret this vibration data pattern:

Machine Type: ${machineType}
Sample Size: ${rawData.length} data points
Duration: ${((rawData[rawData.length - 1]?.timestamp || 0) - (rawData[0]?.timestamp || 0)) / 1000}s

Statistics:
- X-axis: Mean=${stats.meanX.toFixed(4)}g, StdDev=${stats.stdX.toFixed(4)}g, Max=${stats.maxX.toFixed(4)}g
- Y-axis: Mean=${stats.meanY.toFixed(4)}g, StdDev=${stats.stdY.toFixed(4)}g, Max=${stats.maxY.toFixed(4)}g
- Z-axis: Mean=${stats.meanZ.toFixed(4)}g, StdDev=${stats.stdZ.toFixed(4)}g, Max=${stats.maxZ.toFixed(4)}g

Respond in JSON only (no other text):
{
  "pattern": "Name of detected pattern (e.g., 'Imbalance', 'Bearing Defect', 'Normal')",
  "interpretation": "2-3 sentence technical interpretation",
  "concerns": ["Concern 1", "Concern 2"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Pattern interpretation error:', error);
    return {
      pattern: 'Unknown',
      interpretation: 'Unable to interpret pattern automatically. Please review the raw data manually.',
      concerns: []
    };
  }
}

// Helper functions
function calculateDeviation(current?: number, baseline?: number): number | null {
  if (current === undefined || baseline === undefined || baseline === 0) {
    return null;
  }
  return ((current - baseline) / baseline) * 100;
}

function calculateRawDataStats(data: Array<{ x: number; y: number; z: number }>) {
  const n = data.length;
  if (n === 0) {
    return { meanX: 0, meanY: 0, meanZ: 0, stdX: 0, stdY: 0, stdZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }

  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumZ = data.reduce((s, d) => s + d.z, 0);
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  const meanZ = sumZ / n;
  
  const varX = data.reduce((s, d) => s + Math.pow(d.x - meanX, 2), 0) / n;
  const varY = data.reduce((s, d) => s + Math.pow(d.y - meanY, 2), 0) / n;
  const varZ = data.reduce((s, d) => s + Math.pow(d.z - meanZ, 2), 0) / n;

  return {
    meanX, meanY, meanZ,
    stdX: Math.sqrt(varX),
    stdY: Math.sqrt(varY),
    stdZ: Math.sqrt(varZ),
    maxX: Math.max(...data.map(d => Math.abs(d.x))),
    maxY: Math.max(...data.map(d => Math.abs(d.y))),
    maxZ: Math.max(...data.map(d => Math.abs(d.z))),
  };
}

function generateFallbackAnalysis(deviations: Record<string, number | null>): AnalysisResult {
  const values = Object.values(deviations).filter((v): v is number => v !== null);
  const avgDeviation = values.length > 0 
    ? values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length 
    : 0;

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let title = 'Normal Operation';
  let findings: string[] = [];
  let causes: string[] = [];
  let recommendations: string[] = [];
  
  if (avgDeviation > 70) {
    severity = 'critical';
    title = 'Critical Vibration Levels Detected';
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      'Vibration levels significantly exceed acceptable thresholds',
      'Immediate attention required to prevent equipment failure'
    ];
    causes = [
      'Severe bearing wear or damage',
      'Major imbalance in rotating components',
      'Structural looseness or foundation issues',
      'Coupling failure or severe misalignment'
    ];
    recommendations = [
      'URGENT: Stop machine and perform emergency inspection',
      'Check all bearings for damage or excessive wear',
      'Inspect mounting bolts and foundation',
      'Verify coupling alignment and condition',
      'Do not operate until root cause is identified'
    ];
  } else if (avgDeviation > 40) {
    severity = 'high';
    title = 'High Vibration Alert';
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      'Vibration levels exceed warning thresholds',
      'Maintenance should be scheduled soon'
    ];
    causes = [
      'Bearing wear progressing',
      'Developing imbalance',
      'Misalignment issues',
      'Looseness in mounting'
    ];
    recommendations = [
      'Schedule maintenance within 48-72 hours',
      'Increase monitoring frequency to daily',
      'Prepare replacement bearings',
      'Check lubrication levels',
      'Document any unusual sounds or temperatures'
    ];
  } else if (avgDeviation > 15) {
    severity = 'medium';
    title = 'Moderate Vibration Increase';
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      'Early signs of mechanical wear detected',
      'Condition is degrading but manageable'
    ];
    causes = [
      'Normal wear progression',
      'Minor imbalance developing',
      'Lubrication degradation',
      'Environmental factors'
    ];
    recommendations = [
      'Continue monitoring with increased attention',
      'Schedule inspection within 1-2 weeks',
      'Check and replenish lubrication',
      'Review maintenance history for patterns',
      'Prepare maintenance plan'
    ];
  } else {
    severity = 'low';
    title = 'Normal Operation';
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      'Vibration levels within acceptable range',
      'Machine operating normally'
    ];
    causes = [];
    recommendations = [
      'Continue regular monitoring schedule',
      'Next recommended check: 1 month',
      'Maintain current maintenance intervals',
      'No immediate action required'
    ];
  }

  return {
    severity,
    title,
    summary: `Machine shows ${avgDeviation.toFixed(1)}% average deviation from baseline. ${
      severity === 'critical' ? 'Immediate action required.' :
      severity === 'high' ? 'Schedule maintenance soon.' :
      severity === 'medium' ? 'Monitor closely.' :
      'Operating normally.'
    }`,
    findings,
    possibleCauses: causes,
    recommendations,
    predictedTimeToFailure: severity === 'critical' ? 'Days to weeks' : 
                           severity === 'high' ? 'Weeks to months' : 
                           null,
    confidenceScore: 0.7,
    generatedAt: new Date().toISOString()
  };
}

function generateFallbackReport(
  machines: any[], 
  avgHealth: number, 
  criticalCount: number,
  period: string
): ReportResult {
  return {
    title: `Machine Health Report - ${period}`,
    executiveSummary: `This report covers ${machines.length} machines with an average health score of ${avgHealth.toFixed(1)}%. ${
      criticalCount > 0 
        ? `${criticalCount} machine(s) require immediate attention due to critical health scores.` 
        : 'All systems are operating within acceptable parameters.'
    }`,
    healthOverview: `The monitored equipment fleet shows ${
      avgHealth >= 90 ? 'excellent' : avgHealth >= 80 ? 'good' : avgHealth >= 70 ? 'fair' : 'concerning'
    } overall health. ${
      criticalCount > 0 
        ? `There are ${criticalCount} critical machines that need immediate maintenance intervention to prevent potential failures.`
        : 'Regular maintenance schedules should be continued to maintain current performance levels.'
    }`,
    criticalFindings: criticalCount > 0 
      ? [
          `${criticalCount} machine(s) have health scores below 70%`,
          'Immediate maintenance intervention is recommended',
          'Risk of unplanned downtime if not addressed'
        ]
      : ['No critical issues detected', 'All machines within acceptable health thresholds'],
    recommendations: [
      criticalCount > 0 ? 'Prioritize maintenance for critical machines immediately' : 'Continue current maintenance schedule',
      'Maintain regular vibration monitoring intervals',
      'Keep spare parts inventory updated for common wear items',
      'Train operators on early warning sign recognition',
      'Review and update baseline measurements quarterly'
    ],
    maintenancePriorities: [
      criticalCount > 0 ? 'Critical machines: Immediate (within 24-48 hours)' : 'Routine inspections: Monthly',
      'Warning machines: Within 1-2 weeks',
      'Healthy machines: Regular quarterly maintenance'
    ],
    predictiveInsights: `Based on current trends, ${
      criticalCount > 0 
        ? 'several machines are at risk of failure if maintenance is delayed. Focus resources on critical assets first.'
        : 'the fleet is in stable condition. Continue preventive maintenance to avoid future issues.'
    }`,
    generatedAt: new Date().toISOString()
  };
}

export default {
  analyzeVibrationComparison,
  generateMaintenanceReport,
  interpretVibrationPattern
};
