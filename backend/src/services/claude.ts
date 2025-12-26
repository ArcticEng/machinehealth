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

// Machine-specific failure modes knowledge base
const MACHINE_FAILURE_MODES: Record<string, {
  commonFailures: string[];
  criticalComponents: string[];
  vibrationCharacteristics: string;
  maintenanceNotes: string;
}> = {
  'conveyor': {
    commonFailures: [
      'Belt misalignment causing lateral vibration',
      'Worn or damaged idler bearings',
      'Drive pulley imbalance',
      'Belt splice failure',
      'Take-up system issues',
      'Motor-gearbox coupling wear'
    ],
    criticalComponents: ['Drive pulley bearings', 'Idler rollers', 'Belt splice', 'Gearbox', 'Drive motor'],
    vibrationCharacteristics: 'High Y-axis (lateral) indicates belt tracking issues. High X-axis (axial) suggests pulley misalignment. Z-axis (vertical) increase often indicates bearing wear.',
    maintenanceNotes: 'Check belt tension and tracking weekly. Lubricate bearings per schedule. Inspect belt splice monthly.'
  },
  'pump': {
    commonFailures: [
      'Cavitation damage',
      'Impeller imbalance or erosion',
      'Mechanical seal failure',
      'Bearing wear (thrust and radial)',
      'Coupling misalignment',
      'Foundation looseness'
    ],
    criticalComponents: ['Impeller', 'Mechanical seal', 'Bearings', 'Coupling', 'Shaft'],
    vibrationCharacteristics: 'High 1X frequency indicates imbalance. High 2X suggests misalignment. Broadband high frequency indicates cavitation. Axial vibration often indicates thrust bearing issues.',
    maintenanceNotes: 'Monitor suction pressure to prevent cavitation. Check alignment after any maintenance. Inspect seal faces regularly.'
  },
  'motor': {
    commonFailures: [
      'Bearing failure (most common)',
      'Rotor imbalance',
      'Stator eccentricity',
      'Electrical issues (broken rotor bars)',
      'Misalignment with driven equipment',
      'Soft foot/foundation issues'
    ],
    criticalComponents: ['Drive-end bearing', 'Non-drive-end bearing', 'Rotor', 'Stator', 'Cooling fan'],
    vibrationCharacteristics: 'Electrical issues show at line frequency (50/60Hz) and harmonics. Mechanical imbalance at 1X running speed. Bearing defects at high frequencies.',
    maintenanceNotes: 'Use thermal imaging to detect hot spots. Check bearing lubrication. Verify alignment after coupling work.'
  },
  'fan': {
    commonFailures: [
      'Blade imbalance (erosion, buildup)',
      'Bearing wear',
      'Belt drive issues (if applicable)',
      'Shaft misalignment',
      'Blade damage or cracks',
      'Housing resonance'
    ],
    criticalComponents: ['Fan blades', 'Shaft bearings', 'Drive belts', 'Sheaves/pulleys'],
    vibrationCharacteristics: 'Imbalance dominant at 1X. Blade pass frequency indicates blade issues. High axial vibration suggests blade pitch problems.',
    maintenanceNotes: 'Clean blades regularly to prevent buildup. Check belt tension and condition. Balance fan after blade cleaning.'
  },
  'compressor': {
    commonFailures: [
      'Valve failure',
      'Piston ring wear',
      'Bearing damage',
      'Cylinder scoring',
      'Coupling failure',
      'Foundation bolt looseness'
    ],
    criticalComponents: ['Valves', 'Pistons', 'Cylinders', 'Bearings', 'Seals', 'Coolers'],
    vibrationCharacteristics: 'Valve issues show at running speed harmonics. Rod knock indicates bearing or crosshead wear. High axial indicates thrust bearing issues.',
    maintenanceNotes: 'Monitor valve temperatures. Check oil analysis regularly. Inspect cylinder condition during overhauls.'
  },
  'gearbox': {
    commonFailures: [
      'Gear tooth wear or pitting',
      'Bearing failure',
      'Shaft misalignment',
      'Lubrication problems',
      'Overloading damage',
      'Housing cracks'
    ],
    criticalComponents: ['Gear teeth', 'Input/output bearings', 'Seals', 'Shafts'],
    vibrationCharacteristics: 'Gear mesh frequency indicates tooth condition. Sidebands around GMF suggest modulation from defects. Bearing frequencies indicate bearing health.',
    maintenanceNotes: 'Regular oil analysis critical. Check oil level and condition. Monitor temperature trends.'
  },
  'robot': {
    commonFailures: [
      'Joint bearing wear',
      'Gearbox backlash',
      'Servo motor issues',
      'Encoder problems',
      'Cable fatigue',
      'End effector wear'
    ],
    criticalComponents: ['Joint bearings', 'Harmonic drives', 'Servo motors', 'Encoders', 'Cables'],
    vibrationCharacteristics: 'Each axis shows specific joint health. Cyclic patterns indicate specific joint issues. High frequency indicates bearing or gear problems.',
    maintenanceNotes: 'Calibrate axes regularly. Check cable routing and wear. Lubricate joints per manufacturer schedule.'
  },
  'press': {
    commonFailures: [
      'Slide bearing/gib wear',
      'Clutch/brake wear',
      'Flywheel bearing failure',
      'Connection rod wear',
      'Foundation settling',
      'Hydraulic system issues (if applicable)'
    ],
    criticalComponents: ['Slide gibs', 'Clutch/brake', 'Flywheel', 'Crankshaft bearings', 'Connection rods'],
    vibrationCharacteristics: 'Impact at bottom of stroke indicates die issues. Continuous vibration suggests bearing wear. Irregular patterns indicate clutch/brake problems.',
    maintenanceNotes: 'Check gib clearances regularly. Monitor clutch/brake wear. Inspect counterbalance system.'
  },
  'default': {
    commonFailures: [
      'Bearing wear or failure',
      'Imbalance in rotating components',
      'Misalignment between coupled equipment',
      'Mechanical looseness',
      'Resonance issues',
      'Lubrication problems'
    ],
    criticalComponents: ['Bearings', 'Shafts', 'Couplings', 'Fasteners', 'Seals'],
    vibrationCharacteristics: '1X frequency indicates imbalance. 2X frequency suggests misalignment. High frequency broadband indicates bearing damage or lubrication issues.',
    maintenanceNotes: 'Establish baseline measurements. Monitor trends regularly. Check alignment after maintenance.'
  }
};

function getMachineTypeInfo(machineName: string, machineType: string): typeof MACHINE_FAILURE_MODES['default'] {
  const nameAndType = `${machineName} ${machineType}`.toLowerCase();
  
  // Match against known machine types
  if (nameAndType.includes('conveyor') || nameAndType.includes('belt')) {
    return MACHINE_FAILURE_MODES['conveyor'];
  }
  if (nameAndType.includes('pump')) {
    return MACHINE_FAILURE_MODES['pump'];
  }
  if (nameAndType.includes('motor') || nameAndType.includes('electric')) {
    return MACHINE_FAILURE_MODES['motor'];
  }
  if (nameAndType.includes('fan') || nameAndType.includes('blower')) {
    return MACHINE_FAILURE_MODES['fan'];
  }
  if (nameAndType.includes('compressor')) {
    return MACHINE_FAILURE_MODES['compressor'];
  }
  if (nameAndType.includes('gearbox') || nameAndType.includes('gear') || nameAndType.includes('reducer')) {
    return MACHINE_FAILURE_MODES['gearbox'];
  }
  if (nameAndType.includes('robot') || nameAndType.includes('arm') || nameAndType.includes('assembly')) {
    return MACHINE_FAILURE_MODES['robot'];
  }
  if (nameAndType.includes('press') || nameAndType.includes('stamping') || nameAndType.includes('punch')) {
    return MACHINE_FAILURE_MODES['press'];
  }
  
  return MACHINE_FAILURE_MODES['default'];
}

export async function analyzeVibrationComparison(
  machineName: string,
  machineType: string,
  baselineMetrics: VibrationMetrics,
  currentMetrics: VibrationMetrics,
  historicalContext?: string
): Promise<AnalysisResult> {
  // Get machine-specific failure mode information
  const machineInfo = getMachineTypeInfo(machineName, machineType);
  
  // Calculate deviations
  const deviations = {
    rmsX: calculateDeviation(currentMetrics.rmsX, baselineMetrics.rmsX),
    rmsY: calculateDeviation(currentMetrics.rmsY, baselineMetrics.rmsY),
    rmsZ: calculateDeviation(currentMetrics.rmsZ, baselineMetrics.rmsZ),
    peakX: calculateDeviation(currentMetrics.peakX, baselineMetrics.peakX),
    peakY: calculateDeviation(currentMetrics.peakY, baselineMetrics.peakY),
    peakZ: calculateDeviation(currentMetrics.peakZ, baselineMetrics.peakZ),
  };

  // Determine dominant axis
  const absDeviations = {
    X: Math.abs(deviations.rmsX || 0),
    Y: Math.abs(deviations.rmsY || 0),
    Z: Math.abs(deviations.rmsZ || 0)
  };
  const dominantAxis = Object.entries(absDeviations).sort((a, b) => b[1] - a[1])[0][0];

  const prompt = `You are an expert vibration analyst and predictive maintenance specialist with deep knowledge of industrial equipment failure modes. Analyze the following vibration data and provide machine-specific insights.

## Machine Information
- **Machine Name**: ${machineName}
- **Machine Type**: ${machineType || 'Industrial Equipment'}
${historicalContext ? `- **Historical Context**: ${historicalContext}` : ''}

## Machine-Specific Knowledge
This type of equipment typically experiences these failure modes:
${machineInfo.commonFailures.map(f => `- ${f}`).join('\n')}

**Critical Components to Monitor**: ${machineInfo.criticalComponents.join(', ')}

**Vibration Interpretation for this Machine Type**:
${machineInfo.vibrationCharacteristics}

**Maintenance Notes**: ${machineInfo.maintenanceNotes}

## Baseline Vibration Metrics (healthy reference)
- RMS X-axis (axial): ${baselineMetrics.rmsX?.toFixed(4) || 'N/A'} g
- RMS Y-axis (horizontal/lateral): ${baselineMetrics.rmsY?.toFixed(4) || 'N/A'} g
- RMS Z-axis (vertical): ${baselineMetrics.rmsZ?.toFixed(4) || 'N/A'} g
- Peak X-axis: ${baselineMetrics.peakX?.toFixed(4) || 'N/A'} g
- Peak Y-axis: ${baselineMetrics.peakY?.toFixed(4) || 'N/A'} g
- Peak Z-axis: ${baselineMetrics.peakZ?.toFixed(4) || 'N/A'} g
${baselineMetrics.kurtosisX ? `- Kurtosis: X=${baselineMetrics.kurtosisX.toFixed(2)}, Y=${baselineMetrics.kurtosisY?.toFixed(2)}, Z=${baselineMetrics.kurtosisZ?.toFixed(2)}` : ''}
${baselineMetrics.crestFactorX ? `- Crest Factor: X=${baselineMetrics.crestFactorX.toFixed(2)}, Y=${baselineMetrics.crestFactorY?.toFixed(2)}, Z=${baselineMetrics.crestFactorZ?.toFixed(2)}` : ''}

## Current Vibration Metrics
- RMS X-axis: ${currentMetrics.rmsX?.toFixed(4) || 'N/A'} g (**${deviations.rmsX !== null ? `${deviations.rmsX > 0 ? '+' : ''}${deviations.rmsX.toFixed(1)}%` : 'N/A'}** from baseline)
- RMS Y-axis: ${currentMetrics.rmsY?.toFixed(4) || 'N/A'} g (**${deviations.rmsY !== null ? `${deviations.rmsY > 0 ? '+' : ''}${deviations.rmsY.toFixed(1)}%` : 'N/A'}** from baseline)
- RMS Z-axis: ${currentMetrics.rmsZ?.toFixed(4) || 'N/A'} g (**${deviations.rmsZ !== null ? `${deviations.rmsZ > 0 ? '+' : ''}${deviations.rmsZ.toFixed(1)}%` : 'N/A'}** from baseline)
- Peak X-axis: ${currentMetrics.peakX?.toFixed(4) || 'N/A'} g (${deviations.peakX !== null ? `${deviations.peakX > 0 ? '+' : ''}${deviations.peakX.toFixed(1)}%` : 'N/A'} from baseline)
- Peak Y-axis: ${currentMetrics.peakY?.toFixed(4) || 'N/A'} g (${deviations.peakY !== null ? `${deviations.peakY > 0 ? '+' : ''}${deviations.peakY.toFixed(1)}%` : 'N/A'} from baseline)
- Peak Z-axis: ${currentMetrics.peakZ?.toFixed(4) || 'N/A'} g (${deviations.peakZ !== null ? `${deviations.peakZ > 0 ? '+' : ''}${deviations.peakZ.toFixed(1)}%` : 'N/A'} from baseline)
${currentMetrics.kurtosisX ? `- Kurtosis: X=${currentMetrics.kurtosisX.toFixed(2)}, Y=${currentMetrics.kurtosisY?.toFixed(2)}, Z=${currentMetrics.kurtosisZ?.toFixed(2)}` : ''}
${currentMetrics.crestFactorX ? `- Crest Factor: X=${currentMetrics.crestFactorX.toFixed(2)}, Y=${currentMetrics.crestFactorY?.toFixed(2)}, Z=${currentMetrics.crestFactorZ?.toFixed(2)}` : ''}

**Dominant Deviation Axis**: ${dominantAxis}-axis (${absDeviations[dominantAxis as keyof typeof absDeviations].toFixed(1)}% change)

Provide your analysis in the following JSON format only (no other text):
{
  "severity": "low|medium|high|critical",
  "title": "Brief title specific to ${machineName} condition",
  "summary": "2-3 sentence summary explaining what's happening to this specific machine based on the vibration pattern",
  "findings": [
    "Specific finding about ${machineName} based on vibration data",
    "Which component is likely affected",
    "What the dominant axis deviation indicates for this machine type"
  ],
  "possibleCauses": [
    "Most likely cause specific to ${machineType || 'this equipment'}",
    "Second most likely cause",
    "Third possibility to investigate"
  ],
  "recommendations": [
    "Immediate action specific to this machine",
    "Inspection point relevant to the detected pattern",
    "Maintenance task for the likely affected component",
    "Monitoring recommendation"
  ],
  "predictedTimeToFailure": "Estimated time range based on severity, or null if low severity",
  "confidenceScore": 0.0-1.0
}

**Analysis Guidelines**:
- Severity: low (<15% deviation), medium (15-40%), high (40-70%), critical (>70%)
- Consider which axis shows the most concern and what that specifically indicates for ${machineType || 'this machine type'}
- Reference the machine-specific failure modes when identifying possible causes
- Make recommendations actionable and specific to the components mentioned
- High kurtosis (>4) indicates impacting/bearing defects. High crest factor (>6) indicates shock events.`;

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
    // Return fallback analysis with machine-specific info
    return generateFallbackAnalysis(deviations, machineName, machineType, machineInfo);
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

  // Build machine type summary
  const machineTypes = machines.reduce((acc, m) => {
    const type = m.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const prompt = `You are a predictive maintenance expert generating a comprehensive equipment health report. Analyze the following data and provide actionable insights.

## Report Scope
- Company: ${companyName || 'All Companies'}
- Period: ${period}
- Total Machines: ${machines.length}
- Average Health Score: ${avgHealth.toFixed(1)}%

## Machine Types in Fleet
${Object.entries(machineTypes).map(([type, count]) => `- ${type}: ${count} units`).join('\n')}

## Machine Health Distribution
- Healthy (≥85%): ${healthyMachines.length} machines
- Warning (70-84%): ${warningMachines.length} machines
- Critical (<70%): ${criticalMachines.length} machines

## Critical Machines Requiring Attention
${criticalMachines.length > 0 ? criticalMachines.map(m => {
  const info = getMachineTypeInfo(m.name, m.type || '');
  return `- **${m.name}** (${m.factoryName}): ${m.healthScore}% health, Status: ${m.status}
    - Type: ${m.type || 'Unknown'}
    - Components at risk: ${info.criticalComponents.slice(0, 3).join(', ')}`;
}).join('\n') : 'None'}

## Warning Machines to Monitor
${warningMachines.length > 0 ? warningMachines.map(m => 
  `- ${m.name} (${m.factoryName}): ${m.healthScore}% health, Type: ${m.type || 'Unknown'}`
).join('\n') : 'None'}

## Recent Alerts Summary
${alerts.length > 0 ? alerts.slice(0, 10).map(a => 
  `- [${a.severity.toUpperCase()}] ${a.machineName}: ${a.description}`
).join('\n') : 'No recent alerts'}

## Full Machine List
${machines.map(m => `- ${m.name} (${m.type || 'Unknown'}): ${m.healthScore}% (${m.status})`).join('\n')}

Generate a comprehensive maintenance report in the following JSON format only (no other text):
{
  "executiveSummary": "3-4 sentence high-level summary for management including specific machine types at risk",
  "healthOverview": "Detailed paragraph about overall fleet health with machine-type specific insights",
  "criticalFindings": ["Critical finding with specific machine names", "Another finding"],
  "recommendations": ["Prioritized recommendation mentioning specific machines/types", "Recommendation 2", "Recommendation 3", "Recommendation 4", "Recommendation 5"],
  "maintenancePriorities": ["Priority 1 with specific machine name and timeline", "Priority 2", "Priority 3"],
  "predictiveInsights": "Paragraph about predicted issues based on machine types and their common failure modes"
}

Focus on:
1. Machine-specific risks based on equipment type
2. Which specific machines need attention first and why
3. Common failure patterns for the machine types present
4. Cost-effective maintenance scheduling considering machine criticality
5. Specific, actionable recommendations with machine names and timelines`;

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
  // Get machine-specific info
  const machineInfo = getMachineTypeInfo('', machineType);
  
  // Calculate statistics from raw data
  const stats = calculateRawDataStats(rawData);
  
  const prompt = `As a vibration analysis expert, interpret this vibration data pattern for a ${machineType}.

## Machine-Specific Context
Common failures for this type: ${machineInfo.commonFailures.slice(0, 3).join(', ')}
Key components: ${machineInfo.criticalComponents.join(', ')}
Vibration notes: ${machineInfo.vibrationCharacteristics}

## Sample Data
- Sample Size: ${rawData.length} data points
- Duration: ${((rawData[rawData.length - 1]?.timestamp || 0) - (rawData[0]?.timestamp || 0)) / 1000}s

## Statistics
- X-axis (axial): Mean=${stats.meanX.toFixed(4)}g, StdDev=${stats.stdX.toFixed(4)}g, Max=${stats.maxX.toFixed(4)}g
- Y-axis (horizontal): Mean=${stats.meanY.toFixed(4)}g, StdDev=${stats.stdY.toFixed(4)}g, Max=${stats.maxY.toFixed(4)}g
- Z-axis (vertical): Mean=${stats.meanZ.toFixed(4)}g, StdDev=${stats.stdZ.toFixed(4)}g, Max=${stats.maxZ.toFixed(4)}g

Respond in JSON only (no other text):
{
  "pattern": "Name of detected pattern specific to ${machineType} (e.g., 'Bearing Inner Race Defect', 'Rotor Imbalance', 'Belt Misalignment')",
  "interpretation": "2-3 sentence technical interpretation relating to ${machineType} components",
  "concerns": ["Specific concern for this machine type", "Component at risk"]
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

function generateFallbackAnalysis(
  deviations: Record<string, number | null>,
  machineName: string,
  machineType: string,
  machineInfo: typeof MACHINE_FAILURE_MODES['default']
): AnalysisResult {
  const values = Object.values(deviations).filter((v): v is number => v !== null);
  const avgDeviation = values.length > 0 
    ? values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length 
    : 0;

  // Find dominant axis
  const axisDeviations = {
    X: Math.abs(deviations.rmsX || 0),
    Y: Math.abs(deviations.rmsY || 0),
    Z: Math.abs(deviations.rmsZ || 0)
  };
  const dominantAxis = Object.entries(axisDeviations).sort((a, b) => b[1] - a[1])[0];

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let title = `${machineName} - Normal Operation`;
  let findings: string[] = [];
  let causes: string[] = [];
  let recommendations: string[] = [];
  
  if (avgDeviation > 70) {
    severity = 'critical';
    title = `${machineName} - Critical Condition`;
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      `Dominant axis: ${dominantAxis[0]}-axis with ${dominantAxis[1].toFixed(1)}% deviation`,
      `Critical components at risk: ${machineInfo.criticalComponents.slice(0, 2).join(', ')}`
    ];
    causes = machineInfo.commonFailures.slice(0, 3);
    recommendations = [
      `URGENT: Stop ${machineName} and perform emergency inspection`,
      `Check ${machineInfo.criticalComponents[0]} for damage`,
      `Inspect ${machineInfo.criticalComponents[1]} condition`,
      machineInfo.maintenanceNotes,
      'Do not operate until root cause is identified'
    ];
  } else if (avgDeviation > 40) {
    severity = 'high';
    title = `${machineName} - High Vibration Alert`;
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      `${dominantAxis[0]}-axis shows highest change (${dominantAxis[1].toFixed(1)}%)`,
      `Pattern suggests ${machineInfo.commonFailures[0].toLowerCase()}`
    ];
    causes = machineInfo.commonFailures.slice(0, 3);
    recommendations = [
      `Schedule maintenance for ${machineName} within 48-72 hours`,
      `Inspect ${machineInfo.criticalComponents[0]}`,
      machineInfo.maintenanceNotes,
      'Increase monitoring frequency to daily'
    ];
  } else if (avgDeviation > 15) {
    severity = 'medium';
    title = `${machineName} - Moderate Change Detected`;
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      `${dominantAxis[0]}-axis shows primary change`,
      'Early signs of wear detected'
    ];
    causes = [machineInfo.commonFailures[0], 'Normal wear progression', 'Environmental factors'];
    recommendations = [
      `Monitor ${machineName} closely`,
      `Schedule inspection within 1-2 weeks`,
      machineInfo.maintenanceNotes,
      'Review maintenance history'
    ];
  } else {
    severity = 'low';
    title = `${machineName} - Normal Operation`;
    findings = [
      `Average deviation from baseline: ${avgDeviation.toFixed(1)}%`,
      'Vibration levels within acceptable range',
      `${machineName} operating normally`
    ];
    causes = [];
    recommendations = [
      'Continue regular monitoring schedule',
      'Next recommended check: 1 month',
      'Maintain current maintenance intervals'
    ];
  }

  return {
    severity,
    title,
    summary: `${machineName} shows ${avgDeviation.toFixed(1)}% average deviation from baseline with ${dominantAxis[0]}-axis being dominant. ${
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
                           undefined,
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
