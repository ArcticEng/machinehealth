import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, RefreshCw, Download, Loader2, AlertCircle, Save, FileText, CheckCircle, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, BarChart, Bar } from 'recharts';
import React from 'react';
import { machinesAPI, samplesAPI, baselinesAPI, analyticsAPI, aiAPI } from '../services/api';

interface Machine {
  id: string;
  name: string;
  factoryName: string;
}

interface Sample {
  id: string;
  name: string;
  metrics: any;
  rawData?: any[];
  recordedAt: string;
  dataPoints?: number;
  durationSeconds?: number;
}

interface ComparisonData {
  sample: Sample | null;
  baseline: Sample | null;
  comparison: any;
}

interface AIAnalysisResult {
  severity: string;
  title: string;
  summary: string;
  findings: string[];
  possibleCauses: string[];
  recommendations: string[];
  predictedTimeToFailure?: string;
  confidenceScore: number;
}

export default function CompareScreen() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [selectedAxis, setSelectedAxis] = useState<'x' | 'y' | 'z'>('x');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPdfUrl, setSavedPdfUrl] = useState<string | null>(null);
  
  // Sample vs Sample state
  const [sample1Id, setSample1Id] = useState<string>('');
  const [sample2Id, setSample2Id] = useState<string>('');
  const [sampleComparison, setSampleComparison] = useState<ComparisonData | null>(null);
  const [sampleAxis, setSampleAxis] = useState<'x' | 'y' | 'z'>('x');
  const [sampleAiAnalysis, setSampleAiAnalysis] = useState<string | null>(null);
  const [sampleAiResult, setSampleAiResult] = useState<AIAnalysisResult | null>(null);
  const [analyzingSampleAi, setAnalyzingSampleAi] = useState(false);
  const [savingSample, setSavingSample] = useState(false);
  const [sampleSaveSuccess, setSampleSaveSuccess] = useState(false);
  const [samplePdfUrl, setSamplePdfUrl] = useState<string | null>(null);

  // Load machines on mount
  useEffect(() => {
    loadMachines();
  }, []);

  // Load samples when machine changes
  useEffect(() => {
    if (selectedMachine) {
      loadSamples(selectedMachine);
    }
  }, [selectedMachine]);

  // Load comparison when sample changes
  useEffect(() => {
    if (selectedSample) {
      loadComparison(selectedSample);
    }
  }, [selectedSample]);

  // Load sample comparison when both samples selected
  useEffect(() => {
    if (sample1Id && sample2Id && sample1Id !== sample2Id) {
      loadSampleComparison();
    }
  }, [sample1Id, sample2Id]);

  const loadMachines = async () => {
    try {
      const data = await machinesAPI.getAll();
      setMachines(data);
      if (data.length > 0) {
        setSelectedMachine(data[0].id);
      }
    } catch (err: any) {
      const mockMachines = [
        { id: 'mock-1', name: 'Conveyor Belt #1', factoryName: 'Factory Alpha' },
        { id: 'mock-2', name: 'Press Machine #3', factoryName: 'Factory Alpha' },
        { id: 'mock-3', name: 'Assembly Robot #2', factoryName: 'Factory Beta' },
      ];
      setMachines(mockMachines);
      setSelectedMachine('mock-1');
    } finally {
      setLoading(false);
    }
  };

  const loadSamples = async (machineId: string) => {
    try {
      const data = await samplesAPI.getAll(machineId);
      setSamples(data);
      if (data.length > 0) {
        setSelectedSample(data[0].id);
        // Pre-select first two samples for comparison
        if (data.length >= 2) {
          setSample1Id(data[0].id);
          setSample2Id(data[1].id);
        } else if (data.length === 1) {
          setSample1Id(data[0].id);
          setSample2Id('');
        }
      } else {
        setSelectedSample('');
        setComparisonData(null);
        setSample1Id('');
        setSample2Id('');
      }
    } catch (err) {
      const mockSamples = generateMockSamples();
      setSamples(mockSamples);
      if (mockSamples.length > 0) {
        setSelectedSample(mockSamples[0].id);
        setSample1Id(mockSamples[0].id);
        if (mockSamples.length >= 2) {
          setSample2Id(mockSamples[1].id);
        }
      }
    }
  };

  const loadComparison = async (sampleId: string) => {
    setComparing(true);
    setAiAnalysis(null);
    setAiAnalysisResult(null);
    setSaveSuccess(false);
    setSavedPdfUrl(null);
    try {
      const data = await analyticsAPI.compareSample(sampleId);
      // If baseline is null, try to find one from samples
      if (!data.baseline && samples.length > 1) {
        const baselineSample = samples.find(s => s.id !== sampleId);
        if (baselineSample) {
          data.baseline = baselineSample;
          // Calculate comparison
          if (data.sample?.metrics && baselineSample.metrics) {
            data.comparison = calculateComparison(baselineSample.metrics, data.sample.metrics);
          }
        }
      }
      setComparisonData(data);
    } catch (err) {
      // Use selected sample and find another for comparison
      const currentSample = samples.find(s => s.id === sampleId);
      const baselineSample = samples.find(s => s.id !== sampleId);
      
      if (currentSample) {
        const comparison = baselineSample && currentSample.metrics && baselineSample.metrics
          ? calculateComparison(baselineSample.metrics, currentSample.metrics)
          : null;
        
        setComparisonData({
          sample: currentSample,
          baseline: baselineSample || null,
          comparison
        });
      } else {
        const mockComparison = generateMockComparison();
        setComparisonData(mockComparison);
      }
    } finally {
      setComparing(false);
    }
  };

  const loadSampleComparison = () => {
    const s1 = samples.find(s => s.id === sample1Id);
    const s2 = samples.find(s => s.id === sample2Id);
    
    // Reset AI analysis when samples change
    setSampleAiAnalysis(null);
    setSampleAiResult(null);
    setSampleSaveSuccess(false);
    setSamplePdfUrl(null);
    
    if (s1 && s2) {
      const comparison = calculateComparison(s1.metrics, s2.metrics);
      setSampleComparison({
        sample: s2,  // Sample 2 is "current"
        baseline: s1, // Sample 1 is "baseline"
        comparison
      });
    } else {
      setSampleComparison(null);
    }
  };

  const calculateComparison = (baseline: any, current: any) => {
    const calc = (b: number, c: number) => b > 0 ? ((c - b) / b) * 100 : 0;
    return {
      rmsX: calc(baseline.rmsX || 0, current.rmsX || 0),
      rmsY: calc(baseline.rmsY || 0, current.rmsY || 0),
      rmsZ: calc(baseline.rmsZ || 0, current.rmsZ || 0),
      peakX: calc(baseline.peakX || 0, current.peakX || 0),
      peakY: calc(baseline.peakY || 0, current.peakY || 0),
      peakZ: calc(baseline.peakZ || 0, current.peakZ || 0),
    };
  };

  const generateMockSamples = (): Sample[] => {
    return [
      { 
        id: 'sample-1', 
        name: 'Recording - Today 10:30 AM', 
        metrics: { rmsX: 0.95, rmsY: 0.82, rmsZ: 0.88, peakX: 2.1, peakY: 1.8, peakZ: 1.95 },
        recordedAt: new Date().toISOString(),
        dataPoints: 500,
        durationSeconds: 5
      },
      { 
        id: 'sample-2', 
        name: 'Recording - Yesterday 2:15 PM', 
        metrics: { rmsX: 0.78, rmsY: 0.71, rmsZ: 0.75, peakX: 1.8, peakY: 1.5, peakZ: 1.7 },
        recordedAt: new Date(Date.now() - 86400000).toISOString(),
        dataPoints: 500,
        durationSeconds: 5
      },
      { 
        id: 'sample-3', 
        name: 'Baseline - Dec 10', 
        metrics: { rmsX: 0.59, rmsY: 0.45, rmsZ: 0.50, peakX: 1.2, peakY: 1.0, peakZ: 1.1 },
        recordedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        dataPoints: 500,
        durationSeconds: 5
      },
    ];
  };

  const generateMockComparison = (): ComparisonData => {
    const baselineData = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      value: 0.5 + Math.sin(i * 0.5) * 0.15 + Math.random() * 0.05
    }));
    
    const currentData = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      value: 0.85 + Math.sin(i * 0.5) * 0.25 + Math.random() * 0.1
    }));

    return {
      sample: {
        id: 'current',
        name: 'Current Sample',
        metrics: { rmsX: 0.95, rmsY: 0.82, rmsZ: 0.88, peakX: 2.1, peakY: 1.8, peakZ: 1.95 },
        rawData: currentData,
        recordedAt: new Date().toISOString()
      },
      baseline: {
        id: 'baseline',
        name: 'Baseline',
        metrics: { rmsX: 0.59, rmsY: 0.45, rmsZ: 0.50, peakX: 1.2, peakY: 1.0, peakZ: 1.1 },
        rawData: baselineData,
        recordedAt: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      comparison: {
        rmsX: 61.0,
        rmsY: 82.2,
        rmsZ: 76.0,
        peakX: 75.0,
        peakY: 80.0,
        peakZ: 77.3
      }
    };
  };

  const getChartData = (data: ComparisonData | null, axis: 'x' | 'y' | 'z') => {
    if (!data?.sample?.rawData || !data?.baseline?.rawData) {
      // Generate mock chart data based on metrics
      const baseRms = data?.baseline?.metrics?.[`rms${axis.toUpperCase()}`] || 0.5;
      const currentRms = data?.sample?.metrics?.[`rms${axis.toUpperCase()}`] || 0.85;
      
      return Array.from({ length: 10 }, (_, i) => ({
        time: i,
        baseline: baseRms + Math.sin(i * 0.5) * (baseRms * 0.3),
        current: currentRms + Math.sin(i * 0.5) * (currentRms * 0.3)
      }));
    }

    const baselineData = data.baseline.rawData;
    const currentData = data.sample.rawData;
    
    return baselineData.map((b: any, i: number) => ({
      time: i,
      baseline: b[axis] || b.value || 0,
      current: currentData[i]?.[axis] || currentData[i]?.value || 0
    }));
  };

  const getDeviation = (comparison: any, axis: 'x' | 'y' | 'z') => {
    if (!comparison) return null;
    const key = `rms${axis.toUpperCase()}`;
    return comparison[key];
  };

  const runAiAnalysis = async (
    compData: ComparisonData | null,
    setAnalyzing: (v: boolean) => void,
    setAnalysis: (v: string | null) => void,
    setResult: (v: AIAnalysisResult | null) => void,
    isSampleComparison: boolean = false
  ) => {
    if (!compData) return;
    
    setAnalyzing(true);
    setError(null);
    
    if (isSampleComparison) {
      setSampleSaveSuccess(false);
      setSamplePdfUrl(null);
    } else {
      setSaveSuccess(false);
      setSavedPdfUrl(null);
    }
    
    try {
      const machineId = selectedMachine;
      const baselineMetrics = compData.baseline?.metrics || {};
      const currentMetrics = compData.sample?.metrics || {};
      
      try {
        const result = await aiAPI.analyzeComparison({
          machineId,
          baselineMetrics,
          currentMetrics
        });
        
        setResult(result);
        
        const severityEmoji = result.severity === 'critical' ? '🚨' : 
                              result.severity === 'high' ? '⚠️' : 
                              result.severity === 'medium' ? '⚡' : '✅';
        
        let analysis = `${severityEmoji} **${result.title}**\n\n${result.summary}\n\n`;
        
        if (result.findings && result.findings.length > 0) {
          analysis += `**Key Findings:**\n${result.findings.map(f => `• ${f}`).join('\n')}\n\n`;
        }
        
        if (result.possibleCauses && result.possibleCauses.length > 0) {
          analysis += `**Possible Causes:**\n${result.possibleCauses.map(c => `• ${c}`).join('\n')}\n\n`;
        }
        
        if (result.recommendations && result.recommendations.length > 0) {
          analysis += `**Recommendations:**\n${result.recommendations.map(r => `• ${r}`).join('\n')}\n\n`;
        }
        
        if (result.predictedTimeToFailure) {
          analysis += `**Predicted Time to Failure:** ${result.predictedTimeToFailure}\n\n`;
        }
        
        analysis += `_Confidence: ${Math.round(result.confidenceScore * 100)}%_`;
        
        setAnalysis(analysis);
      } catch (apiError) {
        console.log('AI API not available, using fallback analysis');
        const deviationX = getDeviation(compData.comparison, 'x') || 0;
        const deviationY = getDeviation(compData.comparison, 'y') || 0;
        const deviationZ = getDeviation(compData.comparison, 'z') || 0;
        const avgDeviation = (Math.abs(deviationX) + Math.abs(deviationY) + Math.abs(deviationZ)) / 3;
        
        let analysis = '';
        let mockResult: AIAnalysisResult;
        
        if (avgDeviation > 50) {
          analysis = `⚠️ **High Vibration Change**\n\nThe vibration levels show a significant change of ${avgDeviation.toFixed(1)}% between the samples.\n\n**Key Findings:**\n• X-axis change: ${deviationX > 0 ? '+' : ''}${deviationX.toFixed(1)}%\n• Y-axis change: ${deviationY > 0 ? '+' : ''}${deviationY.toFixed(1)}%\n• Z-axis change: ${deviationZ > 0 ? '+' : ''}${deviationZ.toFixed(1)}%\n\n**Recommendations:**\n• Schedule immediate inspection\n• Check bearing condition\n• Verify mounting torque specifications`;
          mockResult = {
            severity: 'high',
            title: 'High Vibration Change',
            summary: `The vibration levels show a significant change of ${avgDeviation.toFixed(1)}% between the samples.`,
            findings: [`X-axis change: ${deviationX > 0 ? '+' : ''}${deviationX.toFixed(1)}%`, `Y-axis change: ${deviationY > 0 ? '+' : ''}${deviationY.toFixed(1)}%`, `Z-axis change: ${deviationZ > 0 ? '+' : ''}${deviationZ.toFixed(1)}%`],
            possibleCauses: ['Bearing wear', 'Misalignment', 'Loose mounting'],
            recommendations: ['Schedule immediate inspection', 'Check bearing condition', 'Verify mounting torque specifications'],
            confidenceScore: 0.85
          };
        } else if (avgDeviation > 25) {
          analysis = `⚡ **Moderate Vibration Change**\n\nVibration levels have changed by ${avgDeviation.toFixed(1)}% between samples.\n\n**Recommendations:**\n• Continue regular monitoring\n• Schedule inspection within 1-2 weeks`;
          mockResult = {
            severity: 'medium',
            title: 'Moderate Vibration Change',
            summary: `Vibration levels have changed by ${avgDeviation.toFixed(1)}% between samples.`,
            findings: [`Average change: ${avgDeviation.toFixed(1)}%`],
            possibleCauses: ['Normal wear', 'Environmental factors'],
            recommendations: ['Continue regular monitoring', 'Schedule inspection within 1-2 weeks'],
            confidenceScore: 0.75
          };
        } else {
          analysis = `✅ **Stable Operation**\n\nVibration levels are consistent between samples (${avgDeviation.toFixed(1)}% change).\n\n**Recommendations:**\n• Continue regular monitoring schedule\n• Next recommended check: 1 month`;
          mockResult = {
            severity: 'low',
            title: 'Stable Operation',
            summary: `Vibration levels are consistent between samples (${avgDeviation.toFixed(1)}% change).`,
            findings: ['All metrics within normal variation'],
            possibleCauses: [],
            recommendations: ['Continue regular monitoring schedule', 'Next recommended check: 1 month'],
            confidenceScore: 0.9
          };
        }
        
        setAnalysis(analysis);
        setResult(mockResult);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveComparisonAsPdf = async (
    compData: ComparisonData | null,
    analysisResult: AIAnalysisResult | null,
    setSaving: (v: boolean) => void,
    setSuccess: (v: boolean) => void,
    setPdfUrl: (v: string | null) => void
  ) => {
    if (!analysisResult || !compData) {
      setError('Please generate an AI analysis first');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await aiAPI.saveComparison({
        machineId: selectedMachine,
        baselineSampleId: compData.baseline?.id,
        currentSampleId: compData.sample?.id,
        baselineMetrics: compData.baseline?.metrics || {},
        currentMetrics: compData.sample?.metrics || {},
        analysis: analysisResult
      });

      setSuccess(true);
      setPdfUrl(result.downloadUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to save comparison');
    } finally {
      setSaving(false);
    }
  };

  const exportData = () => {
    if (!comparisonData) return;
    
    const data = {
      machine: machines.find(m => m.id === selectedMachine)?.name,
      sample: comparisonData.sample,
      baseline: comparisonData.baseline,
      comparison: comparisonData.comparison,
      analysis: aiAnalysis,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${selectedMachine}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Reusable comparison view component
  const renderComparisonView = (
    data: ComparisonData | null,
    axis: 'x' | 'y' | 'z',
    setAxis: (v: 'x' | 'y' | 'z') => void,
    analysis: string | null,
    analysisResult: AIAnalysisResult | null,
    analyzing: boolean,
    saving: boolean,
    saveSuccess: boolean,
    pdfUrl: string | null,
    onAnalyze: () => void,
    onSave: () => void,
    label1: string,
    label2: string,
    color1: string,
    color2: string
  ) => (
    <div className="space-y-4">
      {/* Sample Info Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card className={`border-${color1}-500/30 bg-gradient-to-br from-${color1}-500/10 to-transparent`} style={{ borderColor: color1 === 'green' ? 'rgb(34 197 94 / 0.3)' : color1 === 'blue' ? 'rgb(59 130 246 / 0.3)' : 'rgb(239 68 68 / 0.3)' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color1 === 'green' ? '#10b981' : color1 === 'blue' ? '#3b82f6' : '#ef4444' }} />
                <span className="text-xs font-medium text-muted-foreground">{label1}</span>
              </div>
              <p className="font-semibold truncate">{data.baseline?.name || 'No sample'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.baseline?.recordedAt ? formatDate(data.baseline.recordedAt) : '-'}
              </p>
            </CardContent>
          </Card>

          <Card className={`border-${color2}-500/30 bg-gradient-to-br from-${color2}-500/10 to-transparent`} style={{ borderColor: color2 === 'purple' ? 'rgb(168 85 247 / 0.3)' : 'rgb(239 68 68 / 0.3)' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color2 === 'purple' ? '#a855f7' : '#ef4444' }} />
                <span className="text-xs font-medium text-muted-foreground">{label2}</span>
              </div>
              <p className="font-semibold truncate">{data.sample?.name || 'No sample'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.sample?.recordedAt ? formatDate(data.sample.recordedAt) : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Vibration Comparison
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Axis:</span>
              <Select value={axis} onValueChange={(v) => setAxis(v as 'x' | 'y' | 'z')}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x">X</SelectItem>
                  <SelectItem value="y">Y</SelectItem>
                  <SelectItem value="z">Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData(data, axis)}>
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke={color1 === 'green' ? '#10b981' : '#3b82f6'}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: color1 === 'green' ? '#10b981' : '#3b82f6', r: 3 }}
                  name={label1}
                />
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke={color2 === 'purple' ? '#a855f7' : '#ef4444'}
                  strokeWidth={2}
                  dot={{ fill: color2 === 'purple' ? '#a855f7' : '#ef4444', r: 3 }}
                  name={label2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Deviation Summary */}
      <div className="grid grid-cols-3 gap-3">
        {(['x', 'y', 'z'] as const).map((ax) => {
          const deviation = getDeviation(data?.comparison, ax);
          const isHigh = deviation && Math.abs(deviation) > 50;
          const isMedium = deviation && Math.abs(deviation) > 25;
          return (
            <Card key={ax} className={`${isHigh ? 'border-red-500/50 bg-red-500/5' : isMedium ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{ax}-Axis</p>
                <div className="flex items-center justify-center gap-1">
                  {deviation !== null && deviation > 0 ? (
                    <TrendingUp className={`h-4 w-4 ${isHigh ? 'text-red-500' : isMedium ? 'text-yellow-500' : 'text-green-500'}`} />
                  ) : deviation !== null && deviation < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <p className={`text-xl font-bold ${isHigh ? 'text-red-500' : isMedium ? 'text-yellow-500' : 'text-green-500'}`}>
                    {deviation !== null ? `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-green-700 dark:text-green-400">Comparison saved as PDF!</span>
            {pdfUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(pdfUrl, '_blank')}
                className="ml-2"
              >
                <FileText className="h-4 w-4 mr-1" />
                View PDF
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* AI Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>AI Analysis</span>
            <div className="flex items-center gap-2">
              {analysisResult && (
                <Button 
                  onClick={onSave}
                  disabled={saving}
                  size="sm"
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-500/10"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save PDF
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={onAnalyze}
                disabled={analyzing || !data}
                size="sm"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Analyze'
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis ? (
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-2">
              {analysis.split('\n').map((line, i) => (
                <p key={i} className={`${line.startsWith('**') ? 'font-semibold mt-3 text-foreground' : 'text-muted-foreground'} ${line.startsWith('•') ? 'ml-4' : ''}`}>
                  {line.replace(/\*\*/g, '').replace(/_/g, '')}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6 text-sm">
              Click "Analyze" to get AI-powered insights about this comparison.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 space-y-6 pb-24 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-2xl font-semibold">Compare Data</h1>
        
        {/* Machine Selector */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger className="flex-1 bg-white dark:bg-background border-primary/50 text-foreground">
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-popover">
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id} className="text-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium">{machine.name}</span>
                        <span className="text-xs text-muted-foreground">{machine.factoryName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={() => loadComparison(selectedSample)} disabled={!selectedSample}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon" onClick={exportData} disabled={!comparisonData}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {samples.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No samples recorded for this machine yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Record a sample first to enable comparison.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Comparison Tabs */}
          <Tabs defaultValue="baseline" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="baseline">Baseline vs Current</TabsTrigger>
              <TabsTrigger value="samples">Sample vs Sample</TabsTrigger>
            </TabsList>

            {/* BASELINE VS CURRENT TAB */}
            <TabsContent value="baseline" className="space-y-4">
              {/* Sample Selector */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Select Sample to Compare</label>
                  <Select value={selectedSample} onValueChange={setSelectedSample}>
                    <SelectTrigger className="bg-white dark:bg-background text-foreground">
                      <SelectValue placeholder="Select sample to compare" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-popover">
                      {samples.map((sample) => (
                        <SelectItem key={sample.id} value={sample.id} className="text-foreground">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium">{sample.name}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(sample.recordedAt)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Success Alert for baseline comparison */}
              {saveSuccess && (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-green-700 dark:text-green-400">Comparison saved as PDF!</span>
                    {savedPdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(savedPdfUrl, '_blank')}
                        className="ml-2"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View PDF
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {renderComparisonView(
                comparisonData,
                selectedAxis,
                setSelectedAxis,
                aiAnalysis,
                aiAnalysisResult,
                analyzingAi,
                saving,
                saveSuccess,
                savedPdfUrl,
                () => runAiAnalysis(comparisonData, setAnalyzingAi, setAiAnalysis, setAiAnalysisResult, false),
                () => saveComparisonAsPdf(comparisonData, aiAnalysisResult, setSaving, setSaveSuccess, setSavedPdfUrl),
                'BASELINE',
                'CURRENT',
                'green',
                'red'
              )}
            </TabsContent>

            {/* SAMPLE VS SAMPLE TAB */}
            <TabsContent value="samples" className="space-y-4">
              {/* Sample Selectors - Stacked on mobile */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  {/* Sample 1 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sample 1 (Reference)</label>
                    <Select value={sample1Id} onValueChange={setSample1Id}>
                      <SelectTrigger className="w-full bg-white dark:bg-background border-blue-500/50 text-foreground">
                        <SelectValue placeholder="Select first sample" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-popover">
                        {samples.map((sample) => (
                          <SelectItem 
                            key={sample.id} 
                            value={sample.id} 
                            disabled={sample.id === sample2Id}
                            className="text-foreground"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{sample.name}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(sample.recordedAt)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arrow - centered */}
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-px w-8 bg-border" />
                      <ArrowRight className="h-4 w-4 rotate-90" />
                      <div className="h-px w-8 bg-border" />
                    </div>
                  </div>

                  {/* Sample 2 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sample 2 (Compare)</label>
                    <Select value={sample2Id} onValueChange={setSample2Id}>
                      <SelectTrigger className="w-full bg-white dark:bg-background border-purple-500/50 text-foreground">
                        <SelectValue placeholder="Select second sample" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-popover">
                        {samples.map((sample) => (
                          <SelectItem 
                            key={sample.id} 
                            value={sample.id} 
                            disabled={sample.id === sample1Id}
                            className="text-foreground"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{sample.name}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(sample.recordedAt)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Results */}
              {sampleComparison?.baseline && sampleComparison?.sample ? (
                renderComparisonView(
                  sampleComparison,
                  sampleAxis,
                  setSampleAxis,
                  sampleAiAnalysis,
                  sampleAiResult,
                  analyzingSampleAi,
                  savingSample,
                  sampleSaveSuccess,
                  samplePdfUrl,
                  () => runAiAnalysis(sampleComparison, setAnalyzingSampleAi, setSampleAiAnalysis, setSampleAiResult, true),
                  () => saveComparisonAsPdf(sampleComparison, sampleAiResult, setSavingSample, setSampleSaveSuccess, setSamplePdfUrl),
                  'SAMPLE 1',
                  'SAMPLE 2',
                  'blue',
                  'purple'
                )
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select two different samples above to compare them.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
