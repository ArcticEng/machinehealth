import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Square, RotateCcw, Settings, Zap, Smartphone, AlertCircle, Activity } from 'lucide-react';
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
  const [sensorStatus, setSensorStatus] = useState<'checking' | 'available' | 'unavailable' | 'permission-needed'>('checking');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const allDataRef = useRef<AccelerometerData[]>([]);
  const recordingTimeRef = useRef(0);

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

  // Check sensor availability on mount
  useEffect(() => {
    const checkSensorAvailability = async () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = userAgent.includes('android');
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isSamsung = userAgent.includes('samsung');
      
      setDebugInfo(`Platform: ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Other'}${isSamsung ? ' (Samsung)' : ''}`);
      
      // Check if DeviceMotionEvent exists
      if (!('DeviceMotionEvent' in window)) {
        console.log('DeviceMotionEvent not supported');
        setSensorStatus('unavailable');
        setUseMockData(true);
        return;
      }

      // iOS 13+ requires permission
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        console.log('iOS device - permission required');
        setSensorStatus('permission-needed');
        return;
      }

      // Android/other - test if we actually get data
      console.log('Testing accelerometer availability...');
      
      let receivedData = false;
      const testHandler = (event: DeviceMotionEvent) => {
        const acc = event.accelerationIncludingGravity || event.acceleration;
        if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
          receivedData = true;
          console.log('Accelerometer data received:', acc);
        }
      };

      window.addEventListener('devicemotion', testHandler);
      
      // Wait a bit to see if we get data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      window.removeEventListener('devicemotion', testHandler);

      if (receivedData) {
        console.log('Accelerometer is available');
        setSensorStatus('available');
        setUseMockData(false);
      } else {
        console.log('No accelerometer data received - might need user interaction or not available');
        // On Android, we might need user interaction first
        // Don't immediately fall back to mock data
        setSensorStatus('available'); // Assume available, will verify on record
        setUseMockData(false);
      }
    };

    checkSensorAvailability();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setSensorStatus('available');
          setUseMockData(false);
          return true;
        } else {
          setPermissionError('Permission denied. Please allow motion sensor access in your browser settings.');
          setSensorStatus('unavailable');
          setUseMockData(true);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      setPermissionError('Failed to request permission. Please try again.');
      return false;
    }
  };

  // Mock data generator for demo/testing
  const generateMockData = useCallback(() => {
    const time = allDataRef.current.length / 10;
    return {
      time,
      x: Math.sin(allDataRef.current.length * 0.1) * 2 + Math.random() * 0.5 - 0.25,
      y: Math.cos(allDataRef.current.length * 0.15) * 1.5 + Math.random() * 0.3 - 0.15,
      z: 9.8 + Math.sin(allDataRef.current.length * 0.08) * 0.5 + Math.random() * 0.2 - 0.1,
      timestamp: Date.now()
    };
  }, []);

  // Mock data recording effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && useMockData) {
      interval = setInterval(() => {
        const newPoint = generateMockData();
        
        allDataRef.current = [...allDataRef.current, newPoint];
        setAllData([...allDataRef.current]);
        setDisplayData(prev => {
          const newData = [...prev, newPoint];
          return newData.slice(-100);
        });
        recordingTimeRef.current += 0.1;
        setRecordingTime(recordingTimeRef.current);
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, useMockData, generateMockData]);

  const handleDataPoint = useCallback((data: AccelerometerData) => {
    allDataRef.current = [...allDataRef.current, data];
    setAllData([...allDataRef.current]);
    setDisplayData(prev => {
      const newData = [...prev, {
        time: data.time,
        x: data.x,
        y: data.y,
        z: data.z
      }];
      return newData.slice(-100);
    });
    recordingTimeRef.current = data.time;
    setRecordingTime(data.time);
  }, []);

  const handleRecord = async () => {
    if (isRecording) return;
    
    // Reset state
    allDataRef.current = [];
    recordingTimeRef.current = 0;
    setAllData([]);
    setDisplayData([]);
    setRecordingTime(0);
    setMetrics(null);
    setPermissionError(null);
    
    // Handle iOS permission
    if (sensorStatus === 'permission-needed') {
      const granted = await requestPermission();
      if (!granted) {
        setUseMockData(true);
        setIsRecording(true);
        return;
      }
    }
    
    // Try to start real accelerometer
    if (!useMockData) {
      console.log('Starting accelerometer recording...');
      const started = accelerometerService.startRecording(handleDataPoint);
      
      if (!started) {
        console.log('Failed to start accelerometer, using mock data');
        setUseMockData(true);
      } else {
        console.log('Accelerometer recording started successfully');
        
        // Verify we're getting data after a short delay
        setTimeout(() => {
          if (allDataRef.current.length === 0) {
            console.log('No data received after 1 second, switching to mock');
            accelerometerService.stopRecording();
            setUseMockData(true);
          }
        }, 1000);
      }
    }
    
    setIsRecording(true);
  };

  const handleStop = () => {
    setIsRecording(false);
    
    let finalData: AccelerometerData[];
    let calculatedMetrics: AccelerometerMetrics;
    
    if (useMockData) {
      finalData = allDataRef.current;
      calculatedMetrics = accelerometerService.calculateMetrics(finalData);
    } else {
      finalData = accelerometerService.stopRecording();
      // If no data from accelerometer, use what we collected via callback
      if (finalData.length === 0) {
        finalData = allDataRef.current;
      }
      calculatedMetrics = accelerometerService.calculateMetrics(finalData);
    }
    
    setMetrics(calculatedMetrics);
    
    const sampleData = {
      data: finalData,
      metrics: calculatedMetrics,
      machineId: selectedMachine,
      machine: machines.find(m => m.id === selectedMachine)?.name || 'Unknown Machine',
      duration: recordingTimeRef.current,
      timestamp: new Date().toISOString(),
    };
    
    onSaveSample(sampleData);
  };

  const handleReset = () => {
    allDataRef.current = [];
    recordingTimeRef.current = 0;
    setAllData([]);
    setDisplayData([]);
    setRecordingTime(0);
    setIsRecording(false);
    setMetrics(null);
    setPermissionError(null);
    
    if (!useMockData) {
      accelerometerService.stopRecording();
    }
  };

  const toggleMockMode = () => {
    if (!isRecording) {
      setUseMockData(!useMockData);
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
        
        {/* Sensor Status Info */}
        {sensorStatus === 'checking' && (
          <Alert>
            <Activity className="h-4 w-4 animate-pulse" />
            <AlertDescription>Checking accelerometer availability...</AlertDescription>
          </Alert>
        )}

        {sensorStatus === 'unavailable' && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              Accelerometer not available on this device. Using simulated data for demo.
            </AlertDescription>
          </Alert>
        )}

        {sensorStatus === 'permission-needed' && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Smartphone className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>iOS Device:</strong> Tap "Record" to grant accelerometer access.
            </AlertDescription>
          </Alert>
        )}

        {permissionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        )}
        
        {/* Machine Selection */}
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
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleMockMode}
            title={useMockData ? "Using Demo Data" : "Using Real Sensor"}
          >
            {useMockData ? <Smartphone className="h-4 w-4 text-yellow-500" /> : <Activity className="h-4 w-4 text-green-500" />}
          </Button>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`${isRecording ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
            >
              {isRecording ? '● Recording' : 'Idle'}
            </Badge>
            <Badge 
              variant="outline" 
              className={useMockData ? "text-yellow-500 border-yellow-500/20" : "text-green-500 border-green-500/20"}
            >
              {useMockData ? 'Demo Mode' : 'Real Sensor'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {recordingTime.toFixed(1)}s
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {allData.length} samples
          </span>
        </div>

        {/* Debug Info (remove in production) */}
        {debugInfo && (
          <p className="text-xs text-muted-foreground">{debugInfo}</p>
        )}
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
              {isRecording && <span className="ml-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />}
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
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
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
                <Activity className="h-5 w-5 mr-2" />
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
