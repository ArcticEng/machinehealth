import PDFDocument from 'pdfkit';

interface ComparisonData {
  machineName: string;
  machineType: string;
  baselineName: string;
  baselineDate: string;
  currentSampleName: string;
  currentSampleDate: string;
  baselineMetrics: {
    rmsX?: number;
    rmsY?: number;
    rmsZ?: number;
    peakX?: number;
    peakY?: number;
    peakZ?: number;
    crestFactorX?: number;
    crestFactorY?: number;
    crestFactorZ?: number;
  };
  currentMetrics: {
    rmsX?: number;
    rmsY?: number;
    rmsZ?: number;
    peakX?: number;
    peakY?: number;
    peakZ?: number;
    crestFactorX?: number;
    crestFactorY?: number;
    crestFactorZ?: number;
  };
  analysis: {
    severity: string;
    title: string;
    summary: string;
    findings: string[];
    possibleCauses: string[];
    recommendations: string[];
    predictedTimeToFailure?: string;
    confidenceScore: number;
  };
}

interface ReportData {
  title: string;
  generatedAt: string;
  period: string;
  companyName?: string;
  factoryName?: string;
  executiveSummary: string;
  healthOverview?: string;
  machineHealth: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    averageScore: number;
  };
  alerts?: {
    total: number;
    critical: number;
  };
  criticalFindings?: string[];
  recommendations: string[];
  maintenancePriorities?: string[];
  predictiveInsights?: string;
  machines: {
    name: string;
    factory?: string;
    health: number;
    status: string;
    trend?: string;
  }[];
}

// Brand colors
const COLORS = {
  primary: '#8b5cf6',      // Purple
  secondary: '#ec4899',    // Pink
  success: '#10b981',      // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  dark: '#1f2937',         // Dark gray
  muted: '#6b7280',        // Gray
  light: '#f3f4f6',        // Light gray
};

function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return COLORS.danger;
    case 'warning':
    case 'medium':
      return COLORS.warning;
    case 'low':
      return COLORS.success;
    default:
      return COLORS.muted;
  }
}

function getHealthColor(score: number): string {
  if (score >= 90) return COLORS.success;
  if (score >= 70) return COLORS.warning;
  return COLORS.danger;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateDeviation(current?: number, baseline?: number): string {
  if (current === undefined || baseline === undefined || baseline === 0) {
    return 'N/A';
  }
  const deviation = ((current - baseline) / baseline) * 100;
  const sign = deviation > 0 ? '+' : '';
  return `${sign}${deviation.toFixed(1)}%`;
}

/**
 * Generate a PDF for vibration comparison analysis
 */
export function generateComparisonPDF(data: ComparisonData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Vibration Analysis - ${data.machineName}`,
          Author: 'MachineHealth AI',
          Subject: 'Vibration Comparison Report',
        }
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with gradient-like effect
      doc.rect(0, 0, doc.page.width, 120).fill(COLORS.primary);
      doc.rect(0, 100, doc.page.width, 20).fill(COLORS.secondary);

      // Logo/Title
      doc.fontSize(28).fillColor('white')
        .text('MachineHealth', 50, 40, { continued: true })
        .fontSize(12).text(' AI Analysis', { baseline: 'bottom' });
      
      doc.fontSize(14).fillColor('white')
        .text('Vibration Comparison Report', 50, 75);

      // Machine Info Box
      doc.roundedRect(50, 140, doc.page.width - 100, 80, 8)
        .fillAndStroke(COLORS.light, COLORS.light);
      
      doc.fontSize(16).fillColor(COLORS.dark)
        .text(data.machineName, 70, 155);
      doc.fontSize(10).fillColor(COLORS.muted)
        .text(`Type: ${data.machineType || 'Industrial Equipment'}`, 70, 175)
        .text(`Generated: ${formatDate(new Date().toISOString())}`, 70, 190);

      // Severity Badge
      const severityColor = getSeverityColor(data.analysis.severity);
      const badgeWidth = 100;
      const badgeX = doc.page.width - 50 - badgeWidth;
      doc.roundedRect(badgeX, 155, badgeWidth, 30, 4).fill(severityColor);
      doc.fontSize(12).fillColor('white')
        .text(data.analysis.severity.toUpperCase(), badgeX, 163, { width: badgeWidth, align: 'center' });

      let y = 240;

      // Analysis Title
      doc.fontSize(18).fillColor(COLORS.dark)
        .text(data.analysis.title, 50, y);
      y += 30;

      // Executive Summary
      doc.fontSize(10).fillColor(COLORS.muted)
        .text(data.analysis.summary, 50, y, { width: doc.page.width - 100 });
      y += 50;

      // Metrics Comparison Table
      doc.fontSize(14).fillColor(COLORS.dark)
        .text('Metrics Comparison', 50, y);
      y += 25;

      // Table Header
      const colWidths = [120, 100, 100, 80];
      const tableX = 50;
      doc.rect(tableX, y, doc.page.width - 100, 25).fill(COLORS.primary);
      doc.fontSize(10).fillColor('white');
      doc.text('Metric', tableX + 10, y + 8);
      doc.text('Baseline', tableX + colWidths[0], y + 8);
      doc.text('Current', tableX + colWidths[0] + colWidths[1], y + 8);
      doc.text('Change', tableX + colWidths[0] + colWidths[1] + colWidths[2], y + 8);
      y += 25;

      // Table Rows
      const metrics = [
        { name: 'RMS X-axis', baseline: data.baselineMetrics.rmsX, current: data.currentMetrics.rmsX },
        { name: 'RMS Y-axis', baseline: data.baselineMetrics.rmsY, current: data.currentMetrics.rmsY },
        { name: 'RMS Z-axis', baseline: data.baselineMetrics.rmsZ, current: data.currentMetrics.rmsZ },
        { name: 'Peak X-axis', baseline: data.baselineMetrics.peakX, current: data.currentMetrics.peakX },
        { name: 'Peak Y-axis', baseline: data.baselineMetrics.peakY, current: data.currentMetrics.peakY },
        { name: 'Peak Z-axis', baseline: data.baselineMetrics.peakZ, current: data.currentMetrics.peakZ },
        { name: 'Crest Factor X', baseline: data.baselineMetrics.crestFactorX, current: data.currentMetrics.crestFactorX },
        { name: 'Crest Factor Y', baseline: data.baselineMetrics.crestFactorY, current: data.currentMetrics.crestFactorY },
        { name: 'Crest Factor Z', baseline: data.baselineMetrics.crestFactorZ, current: data.currentMetrics.crestFactorZ },
      ];

      metrics.forEach((metric, i) => {
        const bgColor = i % 2 === 0 ? '#ffffff' : COLORS.light;
        doc.rect(tableX, y, doc.page.width - 100, 20).fill(bgColor);
        
        doc.fontSize(9).fillColor(COLORS.dark);
        doc.text(metric.name, tableX + 10, y + 6);
        doc.text(metric.baseline?.toFixed(4) || 'N/A', tableX + colWidths[0], y + 6);
        doc.text(metric.current?.toFixed(4) || 'N/A', tableX + colWidths[0] + colWidths[1], y + 6);
        
        const deviation = calculateDeviation(metric.current, metric.baseline);
        const devColor = deviation.startsWith('+') ? COLORS.danger : deviation.startsWith('-') ? COLORS.success : COLORS.muted;
        doc.fillColor(devColor).text(deviation, tableX + colWidths[0] + colWidths[1] + colWidths[2], y + 6);
        
        y += 20;
      });

      y += 20;

      // Findings Section
      if (data.analysis.findings.length > 0) {
        doc.fontSize(14).fillColor(COLORS.dark)
          .text('Key Findings', 50, y);
        y += 20;

        data.analysis.findings.forEach((finding) => {
          doc.fontSize(10).fillColor(COLORS.muted)
            .text('•  ' + finding, 60, y, { width: doc.page.width - 120 });
          y += 18;
        });
        y += 10;
      }

      // Check for page break
      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      // Possible Causes
      if (data.analysis.possibleCauses.length > 0) {
        doc.fontSize(14).fillColor(COLORS.dark)
          .text('Possible Causes', 50, y);
        y += 20;

        data.analysis.possibleCauses.forEach((cause) => {
          doc.fontSize(10).fillColor(COLORS.muted)
            .text('•  ' + cause, 60, y, { width: doc.page.width - 120 });
          y += 18;
        });
        y += 10;
      }

      // Check for page break
      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      // Recommendations
      doc.fontSize(14).fillColor(COLORS.dark)
        .text('Recommendations', 50, y);
      y += 20;

      data.analysis.recommendations.forEach((rec, i) => {
        doc.roundedRect(50, y, doc.page.width - 100, 30, 4)
          .fillAndStroke(COLORS.light, COLORS.light);
        doc.fontSize(10).fillColor(COLORS.dark)
          .text(`${i + 1}. ${rec}`, 60, y + 10, { width: doc.page.width - 130 });
        y += 35;
      });

      // Predicted Time to Failure
      if (data.analysis.predictedTimeToFailure) {
        y += 10;
        doc.roundedRect(50, y, doc.page.width - 100, 40, 4)
          .fillAndStroke('#fef3c7', '#fbbf24');
        doc.fontSize(10).fillColor(COLORS.warning)
          .text('⚠ Predicted Time to Failure: ' + data.analysis.predictedTimeToFailure, 60, y + 15);
      }

      // Footer
      const footerY = doc.page.height - 40;
      doc.fontSize(8).fillColor(COLORS.muted)
        .text(`Confidence Score: ${(data.analysis.confidenceScore * 100).toFixed(0)}%`, 50, footerY)
        .text('Generated by MachineHealth AI', doc.page.width - 180, footerY);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a PDF for maintenance report
 */
export function generateReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: data.title,
          Author: 'MachineHealth AI',
          Subject: 'Machine Health Report',
        }
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.rect(0, 0, doc.page.width, 120).fill(COLORS.primary);
      doc.rect(0, 100, doc.page.width, 20).fill(COLORS.secondary);

      doc.fontSize(28).fillColor('white')
        .text('MachineHealth', 50, 40, { continued: true })
        .fontSize(12).text(' Report', { baseline: 'bottom' });
      
      doc.fontSize(14).fillColor('white')
        .text(data.title, 50, 75);

      // Report Info
      doc.roundedRect(50, 140, doc.page.width - 100, 60, 8)
        .fillAndStroke(COLORS.light, COLORS.light);
      
      doc.fontSize(10).fillColor(COLORS.muted)
        .text(`Generated: ${formatDate(data.generatedAt)}`, 70, 155)
        .text(`Period: ${data.period}`, 70, 170)
        .text(`Company: ${data.companyName || 'All Companies'}`, 70, 185);

      // Health Score Summary
      const scoreBoxX = doc.page.width - 200;
      doc.roundedRect(scoreBoxX, 140, 130, 60, 8)
        .fill(getHealthColor(data.machineHealth.averageScore));
      doc.fontSize(24).fillColor('white')
        .text(`${data.machineHealth.averageScore}%`, scoreBoxX, 155, { width: 130, align: 'center' });
      doc.fontSize(10)
        .text('Avg Health', scoreBoxX, 180, { width: 130, align: 'center' });

      let y = 220;

      // Executive Summary
      doc.fontSize(14).fillColor(COLORS.dark)
        .text('Executive Summary', 50, y);
      y += 20;
      doc.fontSize(10).fillColor(COLORS.muted)
        .text(data.executiveSummary, 50, y, { width: doc.page.width - 100 });
      y += 60;

      // Health Distribution
      doc.fontSize(14).fillColor(COLORS.dark)
        .text('Machine Health Distribution', 50, y);
      y += 25;

      // Health Stats Boxes
      const boxWidth = (doc.page.width - 140) / 4;
      const boxes = [
        { label: 'Total', value: data.machineHealth.total, color: COLORS.muted },
        { label: 'Healthy', value: data.machineHealth.healthy, color: COLORS.success },
        { label: 'Warning', value: data.machineHealth.warning, color: COLORS.warning },
        { label: 'Critical', value: data.machineHealth.critical, color: COLORS.danger },
      ];

      boxes.forEach((box, i) => {
        const x = 50 + i * (boxWidth + 10);
        doc.roundedRect(x, y, boxWidth, 50, 4).fill(box.color);
        doc.fontSize(20).fillColor('white')
          .text(String(box.value), x, y + 10, { width: boxWidth, align: 'center' });
        doc.fontSize(9)
          .text(box.label, x, y + 35, { width: boxWidth, align: 'center' });
      });
      y += 70;

      // Critical Findings
      if (data.criticalFindings && data.criticalFindings.length > 0) {
        doc.fontSize(14).fillColor(COLORS.dark)
          .text('Critical Findings', 50, y);
        y += 20;

        data.criticalFindings.forEach((finding) => {
          doc.fontSize(10).fillColor(COLORS.danger)
            .text('⚠ ' + finding, 60, y, { width: doc.page.width - 120 });
          y += 18;
        });
        y += 10;
      }

      // Check for page break
      if (y > 600) {
        doc.addPage();
        y = 50;
      }

      // Recommendations
      doc.fontSize(14).fillColor(COLORS.dark)
        .text('Recommendations', 50, y);
      y += 20;

      data.recommendations.slice(0, 5).forEach((rec, i) => {
        doc.roundedRect(50, y, doc.page.width - 100, 25, 4)
          .fillAndStroke(i % 2 === 0 ? '#ffffff' : COLORS.light, COLORS.light);
        doc.fontSize(10).fillColor(COLORS.dark)
          .text(`${i + 1}. ${rec}`, 60, y + 8, { width: doc.page.width - 130 });
        y += 28;
      });
      y += 10;

      // Check for page break
      if (y > 500) {
        doc.addPage();
        y = 50;
      }

      // Machine List
      doc.fontSize(14).fillColor(COLORS.dark)
        .text('Machine Status', 50, y);
      y += 25;

      // Table Header
      doc.rect(50, y, doc.page.width - 100, 22).fill(COLORS.primary);
      doc.fontSize(9).fillColor('white');
      doc.text('Machine', 60, y + 7);
      doc.text('Factory', 200, y + 7);
      doc.text('Health', 350, y + 7);
      doc.text('Status', 420, y + 7);
      doc.text('Trend', 490, y + 7);
      y += 22;

      data.machines.slice(0, 15).forEach((machine, i) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        const bgColor = i % 2 === 0 ? '#ffffff' : COLORS.light;
        doc.rect(50, y, doc.page.width - 100, 20).fill(bgColor);
        
        doc.fontSize(8).fillColor(COLORS.dark);
        doc.text(machine.name.substring(0, 25), 60, y + 6);
        doc.text((machine.factory || '-').substring(0, 20), 200, y + 6);
        doc.fillColor(getHealthColor(machine.health))
          .text(`${machine.health}%`, 350, y + 6);
        doc.fillColor(COLORS.dark).text(machine.status, 420, y + 6);
        doc.text(machine.trend || '-', 490, y + 6);
        
        y += 20;
      });

      // Predictive Insights
      if (data.predictiveInsights) {
        y += 20;
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.fontSize(14).fillColor(COLORS.dark)
          .text('Predictive Insights', 50, y);
        y += 20;
        doc.fontSize(10).fillColor(COLORS.muted)
          .text(data.predictiveInsights, 50, y, { width: doc.page.width - 100 });
      }

      // Footer
      const footerY = doc.page.height - 40;
      doc.fontSize(8).fillColor(COLORS.muted)
        .text('Generated by MachineHealth AI Analytics', 50, footerY)
        .text(`Page 1`, doc.page.width - 80, footerY);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default {
  generateComparisonPDF,
  generateReportPDF,
};
