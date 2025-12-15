import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, RefreshCw, Download, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
}

interface ComparisonData {
  sample: Sample | null;
  baseline: Sample | null;
  comparison: any;
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
  const [analyzingAi, setAnalyzingAi] = useState(false);

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

  const loadMachines = async () => {
    try {
      const data = await machinesAPI.getAll();
      setMachines(data);
      if (data.length > 0) {
        setSelectedMachine(data[0].id);
      }
    } catch (err: any) {
      // Use mock data
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
      } else {
        setSelectedSample('');
        setComparisonData(null);
      }
    } catch (err) {
      // Generate mock samples
      const mockSamples = generateMockSamples();
      setSamples(mockSamples);
      if (mockSamples.length > 0) {
        setSelectedSample(mockSamples[0].id);
      }
    }
  };

  const loadComparison = async (sampleId: string) => {
    setComparing(true);
    setAiAnalysis(null);
    try {
      const data = await analyticsAPI.compareSample(sampleId);
      setComparisonData(data);
    } catch (err) {
      // Generate mock comparison
      const mockComparison = generateMockComparison();
      setComparisonData(mockComparison);
    } finally {
      setComparing(false);
    }
  };

  const generateMockSamples = (): Sample[] => {
    return [
      { 
        id: 'sample-1', 
        name: 'Recording - Today 10:30 AM', 
        metrics: { rmsX: 0.95, rmsY: 0.82, rmsZ: 0.88, peakX: 2.1, peakY: 1.8, peakZ: 1.95 },
        recordedAt: new Date().toISOString()
      },
      { 
        id: 'sample-2', 
        name: 'Recording - Yesterday 2:15 PM', 
        metrics: { rmsX: 0.78, rmsY: 0.71, rmsZ: 0.75, peakX: 1.8, peakY: 1.5, peakZ: 1.7 },
        recordedAt: new Date(Date.now() - 86400000).toISOString()
      },
      { 
        id: 'sample-3', 
        name: 'Baseline - Dec 10', 
        metrics: { rmsX: 0.59, rmsY: 0.45, rmsZ: 0.50, peakX: 1.2, peakY: 1.0, peakZ: 1.1 },
        recordedAt: new Date(Date.now() - 4 * 86400000).toISOString()
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

  const getChartData = () => {
    if (!comparisonData?.sample?.rawData || !comparisonData?.baseline?.rawData) {
      // Generate sample chart data
      return Array.from({ length: 10 }, (_, i) => ({
        time: i,
        baseline: 0.5 + Math.sin(i * 0.5) * 0.15,
        current: 0.85 + Math.sin(i * 0.5) * 0.25
      }));
    }

    const baselineData = comparisonData.baseline.rawData;
    const currentData = comparisonData.sample.rawData;
    
    return baselineData.map((b: any, i: number) => ({
      time: i,
      baseline: b[selectedAxis] || b.value || 0,
      current: currentData[i]?.[selectedAxis] || currentData[i]?.value || 0
    }));
  };

  const getDeviation = (axis: 'x' | 'y' | 'z') => {
    if (!comparisonData?.comparison) return null;
    const key = `rms${axis.toUpperCase()}`;
    return comparisonData.comparison[key];
  };

  const runAiAnalysis = async () => {
    setAnalyzingAi(true);
    setError(null);
    try {
      const machineId = selectedMachine;
      const baselineMetrics = comparisonData?.baseline?.metrics || {};
      const currentMetrics = comparisonData?.sample?.metrics || {};
      
      // Try to call the AI API
      try {
        const result = await aiAPI.analyzeComparison({
          machineId,
          baselineMetrics,
          currentMetrics
        });
        
        // Format the AI response for display
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
        
        setAiAnalysis(analysis);
      } catch (apiError) {
        // Fallback to local analysis if API fails
        console.log('AI API not available, using fallback analysis');
        const deviationX = getDeviation('x') || 0;
        const deviationY = getDeviation('y') || 0;
        const deviationZ = getDeviation('z') || 0;
        const avgDeviation = (deviationX + deviationY + deviationZ) / 3;
        
        let analysis = '';
        if (avgDeviation > 50) {
          analysis = `⚠️ **High Vibration Alert**\n\nThe current vibration levels show a significant increase of ${avgDeviation.toFixed(1)}% compared to the baseline.\n\n**Key Findings:**\n• X-axis deviation: +${deviationX.toFixed(1)}%\n• Y-axis deviation: +${deviationY.toFixed(1)}%\n• Z-axis deviation: +${deviationZ.toFixed(1)}%\n\n**Recommendations:**\n• Schedule immediate inspection\n• Check bearing condition\n• Verify mounting torque specifications`;
        } else if (avgDeviation > 25) {
          analysis = `⚡ **Moderate Vibration Increase**\n\nVibration levels have increased by ${avgDeviation.toFixed(1)}% from baseline.\n\n**Recommendations:**\n• Continue regular monitoring\n• Schedule inspection within 1-2 weeks`;
        } else {
          analysis = `✅ **Normal Operation**\n\nVibration levels are within acceptable range (${avgDeviation.toFixed(1)}% deviation from baseline).\n\n**Recommendations:**\n• Continue regular monitoring schedule\n• Next recommended check: 1 month`;
        }
        
        setAiAnalysis(analysis);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI analysis');
    } finally {
      setAnalyzingAi(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-2xl font-semibold">Compare Data</h1>
        
        <div className="flex items-center gap-2">
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="flex-1 bg-card border-primary">
              <SelectValue placeholder="Select machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map((machine) => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.name} ({machine.factoryName})
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

        {samples.length > 0 && (
          <Select value={selectedSample} onValueChange={setSelectedSample}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select sample to compare" />
            </SelectTrigger>
            <SelectContent>
              {samples.map((sample) => (
                <SelectItem key={sample.id} value={sample.id}>
                  {sample.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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

            <TabsContent value="baseline" className="space-y-4">
              {/* Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      Baseline vs Current Comparison
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Axis:</span>
                      <Select value={selectedAxis} onValueChange={(v) => setSelectedAxis(v as 'x' | 'y' | 'z')}>
                        <SelectTrigger className="w-20">
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
                  {comparing ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData()}>
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="baseline" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#10b981' }}
                            name="Baseline"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="current" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            dot={{ fill: '#ef4444' }}
                            name="Current"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deviation Summary */}
              <div className="grid grid-cols-3 gap-4">
                {(['x', 'y', 'z'] as const).map((axis) => {
                  const deviation = getDeviation(axis);
                  const isHigh = deviation && deviation > 50;
                  return (
                    <Card key={axis} className={isHigh ? 'border-red-500/50' : ''}>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm font-medium text-muted-foreground uppercase">{axis}-Axis</p>
                        <p className={`text-2xl font-bold ${isHigh ? 'text-red-500' : deviation && deviation > 25 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {deviation !== null ? `+${deviation.toFixed(1)}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">avg deviation</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* AI Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>AI Analysis</span>
                    <Button 
                      onClick={runAiAnalysis} 
                      disabled={analyzingAi || !comparisonData}
                      size="sm"
                    >
                      {analyzingAi ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        'Generate Analysis'
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aiAnalysis ? (
                    <div className="prose prose-sm max-w-none">
                      {aiAnalysis.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('**') ? 'font-semibold' : ''}>
                          {line.replace(/\*\*/g, '')}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Click "Generate Analysis" to get AI-powered insights about this comparison.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="samples" className="space-y-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Select two samples to compare side by side.</p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sample 1" />
                      </SelectTrigger>
                      <SelectContent>
                        {samples.map((sample) => (
                          <SelectItem key={sample.id} value={sample.id}>
                            {sample.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sample 2" />
                      </SelectTrigger>
                      <SelectContent>
                        {samples.map((sample) => (
                          <SelectItem key={sample.id} value={sample.id}>
                            {sample.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
