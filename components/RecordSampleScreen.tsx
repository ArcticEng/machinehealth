import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Square, RotateCcw, Settings, Zap, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import React from 'react';
import accelerometerService, { AccelerometerData, AccelerometerMetrics } from '../services/accelerometer';
import { machinesAPI } from '../services/api';

interface DataPoint {
  time: number;
  x: number;
  y: number;
  z: number;
}

interface Machine {
  id: string;
  name: string;
  factoryName: string;
}

interface RecordSampleScreenProps {
  onSaveSample: (sampleData: any) => void;
}

export default function RecordSampleScreen({ onSaveSample }: RecordSampleScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [displayData, setDisplayData] = useState<DataPoint[]>([]);
  const [allData, setAllData] = useState<AccelerometerData[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [metrics, setMetrics] = useState<AccelerometerMetrics | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  // Load machines
  useEffect(() => {
    const loadMachines = async () => {
      try {
        const data = await machinesAPI.getAll();
        setMachines(data);
        if (data.length > 0) {
          setSelectedMachine(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load machines:', error);
        // Use mock machines if API fails
        setMachines([
          { id: 'mock-1', name: 'Conveyor Belt #1', factoryName: 'Factory Alpha' },
          { id: 'mock-2', name: 'Press Machine #3', factoryName: 'Factory Alpha' },
          { id: 'mock-3', name: 'Assembly Robot #2', factoryName: 'Factory Beta' },
        ]);
        setSelectedMachine('mock-1');
      }
    };
    loadMachines();
  }, []);

  // Check accelerometer support and request permission on iOS
  useEffect(() => {
    const checkSupport = async () => {
      const supported = accelerometerService.isSupported();
      setIsSupported(supported);
      
      if (!supported) {
        setUseMockData(true);
        return;
      }

      // Check if we need to request permission (iOS 13+)
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        // iOS requires user gesture to request permission
        // Permission will be requested when user taps Record
        setHasPermission(false);
      } else {
        // Android and older iOS - no permission needed
        setHasPermission(true);
      }
    };
    
    checkSupport();
  }, []);

  const requestPermission = async () => {
    try {
      const granted = await accelerometerService.requestPermission();
      setHasPermission(granted);
      if (!granted) {
        setPermissionError('Permission denied. Please allow motion sensor access.');
        setUseMockData(true);
      }
    } catch (error) {
      setPermissionError('Failed to request permission');
      setUseMockData(true);
    }
  };

  // Mock data generator for demo/testing
  const generateMockData = useCallback(() => {
    const time = allData.length / 10;
    return {
      time,
      x: Math.sin(allData.length * 0.1) * 2 + Math.random() * 0.5 - 0.25,
      y: Math.cos(allData.length * 0.15) * 1.5 + Math.random() * 0.3 - 0.15,
      z: Math.sin(allData.length * 0.08) * 1.8 + Math.random() * 0.4 - 0.2,
      timestamp: Date.now()
    };
  }, [allData.length]);

  // Recording effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      if (useMockData) {
        // Use mock data for demo
        interval = setInterval(() => {
          const newPoint = generateMockData();
          
          setAllData(prev => [...prev, newPoint]);
          setDisplayData(prev => {
            const newData = [...prev, newPoint];
            return newData.slice(-100); // Keep last 100 for display
          });
          setRecordingTime(prev => prev + 0.1);
        }, 100);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, useMockData, generateMockData]);

  const handleDataPoint = (data: AccelerometerData) => {
    setAllData(prev => [...prev, data]);
    setDisplayData(prev => {
      const newData = [...prev, {
        time: data.time,
        x: data.x,
        y: data.y,
        z: data.z
      }];
      return newData.slice(-100);
    });
    setRecordingTime(data.time);
  };

  const handleRecord = async () => {
    if (!isRecording) {
      setAllData([]);
      setDisplayData([]);
      setRecordingTime(0);
      setMetrics(null);
      
      if (!useMockData && !hasPermission) {
        await requestPermission();
        if (!hasPermission) {
          setUseMockData(true);
        }
      }
      
      if (!useMockData) {
        const started = accelerometerService.startRecording(handleDataPoint);
        if (!started) {
          setUseMockData(true);
        }
      }
      
      setIsRecording(true);
    }
  };

  const handleStop = () => {
    setIsRecording(false);
    
    let finalData: AccelerometerData[];
    let calculatedMetrics: AccelerometerMetrics;
    
    if (useMockData) {
      finalData = allData;
      calculatedMetrics = accelerometerService.calculateMetrics(allData);
    } else {
      finalData = accelerometerService.stopRecording();
      calculatedMetrics = accelerometerService.calculateMetrics(finalData);
    }
    
    setMetrics(calculatedMetrics);
    
    // Navigate to save screen
    const sampleData = {
      data: finalData,
      metrics: calculatedMetrics,
      machineId: selectedMachine,
      machine: machines.find(m => m.id === selectedMachine)?.name || 'Unknown Machine',
      duration: recordingTime,
      timestamp: new Date().toISOString(),
    };
    
    onSaveSample(sampleData);
  };

  const handleReset = () => {
    setAllData([]);
    setDisplayData([]);
    setRecordingTime(0);
    setIsRecording(false);
    setMetrics(null);
    
    if (!useMockData) {
      accelerometerService.stopRecording();
    }
  };

  const currentMetrics = metrics || accelerometerService.calculateMetrics(allData);

  return (
    <div className="p-4 space-y-6 pb-20 min-h-screen bg-gradient-to-br from-background to-accent/10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-2xl font-semibold">Record Sample</h1>
        
        {!isSupported && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              Device motion not supported on this device. Using simulated data for demo purposes.
            </AlertDescription>
          </Alert>
        )}

        {isSupported && !hasPermission && !useMockData && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Smartphone className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>iOS Device Detected:</strong> Tap the "Record" button to grant accelerometer access. 
              You'll see a permission prompt from your browser.
            </AlertDescription>
          </Alert>
        )}

        {permissionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="bg-input-background">
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
          </div>
          
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`${isRecording ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
            >
              {isRecording ? 'Recording' : 'Idle'}
            </Badge>
            {useMockData && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">
                Demo Mode
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {recordingTime.toFixed(1)}s
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {allData.length} samples
          </span>
        </div>
      </motion.div>

      {/* Live Data Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Live Accelerometer Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-[0px] pr-[5px] pb-[21px] pl-[5px]">
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(val) => val.toFixed(1)}
                  />
                  <YAxis 
                    domain={[-15, 15]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => value.toFixed(3)}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="x" 
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="X-axis"
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Y-axis"
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="z" 
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Z-axis"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-center">Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                className={`${!isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/25' 
                  : 'bg-gray-500 hover:bg-gray-600'
                } text-white transition-all duration-300`}
                onClick={handleRecord}
                disabled={isRecording || !selectedMachine}
              >
                <Square className="h-5 w-5 mr-2 fill-current" />
                Record
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={handleStop}
                disabled={!isRecording || allData.length === 0}
                className="border-red-500/50 hover:border-red-500 hover:bg-red-500/10"
              >
                <Square className="h-5 w-5 mr-2" />
                Stop & Save
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={handleReset}
                className="border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metrics */}
      {allData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-medium">Key Metrics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-500">RMS (X/Y/Z)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-semibold">{currentMetrics.rmsX?.toFixed(3)}</p>
                <p className="text-sm text-muted-foreground">
                  {currentMetrics.rmsY?.toFixed(3)} / {currentMetrics.rmsZ?.toFixed(3)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-500">Peak (X/Y/Z)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-semibold">{currentMetrics.peakX?.toFixed(3)}</p>
                <p className="text-sm text-muted-foreground">
                  {currentMetrics.peakY?.toFixed(3)} / {currentMetrics.peakZ?.toFixed(3)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-500">Crest Factor (X/Y/Z)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-semibold">{currentMetrics.crestFactorX?.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  {currentMetrics.crestFactorY?.toFixed(2)} / {currentMetrics.crestFactorZ?.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-500">Kurtosis (X/Y/Z)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-semibold">{currentMetrics.kurtosisX?.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  {currentMetrics.kurtosisY?.toFixed(2)} / {currentMetrics.kurtosisZ?.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-500">Skewness (X/Y/Z)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-semibold">{currentMetrics.skewnessX?.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  {currentMetrics.skewnessY?.toFixed(2)} / {currentMetrics.skewnessZ?.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-teal-500">Std Dev (X/Y/Z)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-semibold">{currentMetrics.stdDevX?.toFixed(3)}</p>
                <p className="text-sm text-muted-foreground">
                  {currentMetrics.stdDevY?.toFixed(3)} / {currentMetrics.stdDevZ?.toFixed(3)}
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
