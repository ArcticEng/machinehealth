export interface AccelerometerData {
  time: number;
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface AccelerometerMetrics {
  rmsX: number;
  rmsY: number;
  rmsZ: number;
  peakX: number;
  peakY: number;
  peakZ: number;
  crestFactorX: number;
  crestFactorY: number;
  crestFactorZ: number;
  kurtosisX: number;
  kurtosisY: number;
  kurtosisZ: number;
  skewnessX: number;
  skewnessY: number;
  skewnessZ: number;
  stdDevX: number;
  stdDevY: number;
  stdDevZ: number;
}

class AccelerometerService {
  private isRecording = false;
  private data: AccelerometerData[] = [];
  private startTime = 0;
  private onDataCallback: ((data: AccelerometerData) => void) | null = null;
  private permissionGranted = false;
  private sampleRate = 60; // Target samples per second
  private lastSampleTime = 0;
  private minSampleInterval: number;
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null;

  constructor() {
    this.minSampleInterval = 1000 / this.sampleRate;
  }

  async requestPermission(): Promise<boolean> {
    // Check if DeviceMotionEvent requires permission (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        this.permissionGranted = permission === 'granted';
        console.log('iOS permission result:', permission);
        return this.permissionGranted;
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    
    // No permission needed (Android, older iOS)
    this.permissionGranted = true;
    return true;
  }

  isSupported(): boolean {
    const supported = 'DeviceMotionEvent' in window;
    console.log('DeviceMotionEvent supported:', supported);
    return supported;
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.isRecording) return;

    const now = performance.now();
    
    // Throttle to target sample rate
    if (now - this.lastSampleTime < this.minSampleInterval) {
      return;
    }
    this.lastSampleTime = now;

    // Try different acceleration sources
    let acceleration = event.accelerationIncludingGravity;
    
    // Fallback to acceleration without gravity
    if (!acceleration || (acceleration.x === null && acceleration.y === null && acceleration.z === null)) {
      acceleration = event.acceleration;
    }
    
    // If still no data, log and return
    if (!acceleration) {
      console.warn('No acceleration data in motion event');
      return;
    }

    // Handle null values (some devices return null instead of 0)
    const x = acceleration.x ?? 0;
    const y = acceleration.y ?? 0;
    const z = acceleration.z ?? 0;

    // Skip if all values are 0 (might indicate sensor not working)
    if (x === 0 && y === 0 && z === 0) {
      return;
    }

    const dataPoint: AccelerometerData = {
      time: (now - this.startTime) / 1000, // Convert to seconds
      x,
      y,
      z,
      timestamp: Date.now()
    };

    this.data.push(dataPoint);

    if (this.onDataCallback) {
      this.onDataCallback(dataPoint);
    }
  };

  startRecording(onData?: (data: AccelerometerData) => void): boolean {
    if (!this.isSupported()) {
      console.error('Device motion not supported');
      return false;
    }

    // For Android, we don't need explicit permission
    // but we should still request it for consistency
    if (!this.permissionGranted && typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      this.permissionGranted = true;
    }

    console.log('Starting accelerometer recording...');
    
    this.isRecording = true;
    this.data = [];
    this.startTime = performance.now();
    this.lastSampleTime = 0;
    this.onDataCallback = onData || null;

    // Remove any existing listener first
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
    }

    // Store reference to handler for cleanup
    this.motionHandler = this.handleMotion;
    
    // Add event listener with options for better performance
    window.addEventListener('devicemotion', this.handleMotion, { passive: true });
    
    console.log('Accelerometer event listener added');
    return true;
  }

  stopRecording(): AccelerometerData[] {
    console.log('Stopping accelerometer recording, collected', this.data.length, 'samples');
    
    this.isRecording = false;
    
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
    
    this.onDataCallback = null;
    
    return [...this.data];
  }

  getData(): AccelerometerData[] {
    return [...this.data];
  }

  getRecordingDuration(): number {
    if (this.data.length === 0) return 0;
    return this.data[this.data.length - 1].time;
  }

  calculateMetrics(data?: AccelerometerData[]): AccelerometerMetrics {
    const samples = data || this.data;
    
    if (samples.length === 0) {
      return this.getEmptyMetrics();
    }

    const xValues = samples.map(d => d.x);
    const yValues = samples.map(d => d.y);
    const zValues = samples.map(d => d.z);

    return {
      rmsX: this.calculateRMS(xValues),
      rmsY: this.calculateRMS(yValues),
      rmsZ: this.calculateRMS(zValues),
      peakX: this.calculatePeak(xValues),
      peakY: this.calculatePeak(yValues),
      peakZ: this.calculatePeak(zValues),
      crestFactorX: this.calculateCrestFactor(xValues),
      crestFactorY: this.calculateCrestFactor(yValues),
      crestFactorZ: this.calculateCrestFactor(zValues),
      kurtosisX: this.calculateKurtosis(xValues),
      kurtosisY: this.calculateKurtosis(yValues),
      kurtosisZ: this.calculateKurtosis(zValues),
      skewnessX: this.calculateSkewness(xValues),
      skewnessY: this.calculateSkewness(yValues),
      skewnessZ: this.calculateSkewness(zValues),
      stdDevX: this.calculateStdDev(xValues),
      stdDevY: this.calculateStdDev(yValues),
      stdDevZ: this.calculateStdDev(zValues),
    };
  }

  private getEmptyMetrics(): AccelerometerMetrics {
    return {
      rmsX: 0, rmsY: 0, rmsZ: 0,
      peakX: 0, peakY: 0, peakZ: 0,
      crestFactorX: 0, crestFactorY: 0, crestFactorZ: 0,
      kurtosisX: 0, kurtosisY: 0, kurtosisZ: 0,
      skewnessX: 0, skewnessY: 0, skewnessZ: 0,
      stdDevX: 0, stdDevY: 0, stdDevZ: 0,
    };
  }

  private calculateRMS(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val * val, 0);
    return Math.sqrt(sum / values.length);
  }

  private calculatePeak(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.max(...values.map(Math.abs));
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const variance = values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateCrestFactor(values: number[]): number {
    const peak = this.calculatePeak(values);
    const rms = this.calculateRMS(values);
    return rms > 0 ? peak / rms : 0;
  }

  private calculateKurtosis(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const n = values.length;
    const stdDev = this.calculateStdDev(values);
    
    if (stdDev === 0) return 0;
    
    const variance = stdDev ** 2;
    const fourthMoment = values.reduce((acc, val) => acc + (val - mean) ** 4, 0) / n;
    return fourthMoment / (variance ** 2) - 3;
  }

  private calculateSkewness(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const n = values.length;
    const stdDev = this.calculateStdDev(values);
    
    if (stdDev === 0) return 0;
    
    const thirdMoment = values.reduce((acc, val) => acc + (val - mean) ** 3, 0) / n;
    return thirdMoment / (stdDev ** 3);
  }

  // Export data to CSV format
  exportToCSV(data?: AccelerometerData[]): string {
    const samples = data || this.data;
    
    if (samples.length === 0) return '';
    
    const headers = ['time', 'x', 'y', 'z', 'timestamp'];
    const rows = samples.map(d => 
      [d.time.toFixed(4), d.x.toFixed(6), d.y.toFixed(6), d.z.toFixed(6), d.timestamp].join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  // Download CSV file
  downloadCSV(filename: string = 'accelerometer_data.csv'): void {
    const csv = this.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const accelerometerService = new AccelerometerService();

export default accelerometerService;
