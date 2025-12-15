import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Download, Share2, RotateCcw, CheckCircle, Zap, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import React from 'react';
import { type Screen } from '../constants/navigation';
import { samplesAPI } from '../services/api';
import accelerometerService from '../services/accelerometer';

interface SaveSampleScreenProps {
  sampleData: any;
  onNavigate: (screen: Screen) => void;
}

export default function SaveSampleScreen({ sampleData, onNavigate }: SaveSampleScreenProps) {
  const [sampleName, setSampleName] = useState(sampleData?.machine ? `${sampleData.machine} - ${new Date().toLocaleDateString()}` : 'Sample Recording');
  const [notes, setNotes] = useState('');
  const [saveAsBaseline, setSaveAsBaseline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Check if we have a real machine ID or mock
      if (sampleData.machineId?.startsWith('mock-')) {
        // Simulate save for demo mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSaved(true);
        setTimeout(() => {
          onNavigate('record');
        }, 2000);
        return;
      }

      // Save to API
      await samplesAPI.create({
        machineId: sampleData.machineId,
        name: sampleName,
        notes: notes || undefined,
        durationSeconds: sampleData.duration,
        sampleRate: 100,
        metrics: sampleData.metrics,
        rawData: sampleData.data,
        isBaseline: saveAsBaseline
      });

      setIsSaved(true);
      
      // Auto navigate back after success
      setTimeout(() => {
        onNavigate('record');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save sample. Please try again.');
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    onNavigate('record');
  };

  const handleExportCSV = () => {
    if (sampleData?.data) {
      const csv = accelerometerService.exportToCSV(sampleData.data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sampleName.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (isSaved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-accent/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6 max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25"
          >
            <CheckCircle className="h-8 w-8 text-white" />
          </motion.div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Sample Saved Successfully!</h1>
            <p className="text-sm text-muted-foreground">
              {saveAsBaseline ? 'Sample saved as new baseline' : 'Sample saved to your records'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!sampleData) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">No sample data available</p>
        <Button onClick={handleDiscard} className="mt-4">
          Back to Recording
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20 min-h-screen bg-gradient-to-br from-background to-accent/10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-semibold">Save Sample Recording</h1>
        <p className="text-muted-foreground">
          Review your recording and choose how to save it
        </p>
      </motion.div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sample Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold">{sampleData.duration?.toFixed(1)}s</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{sampleData.data?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Data Points</p>
              </div>
              <div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Complete
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sample Graph */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Recorded Sample Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sampleData.data?.slice(-200) || []}>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val}
                  />
                  <YAxis 
                    domain={[-15, 15]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="x" 
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="X-axis"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Y-axis"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="z" 
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Z-axis"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm font-medium text-red-500">RMS (X)</p>
                <p className="text-lg font-semibold">{sampleData.metrics?.rmsX?.toFixed(3) || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm font-medium text-green-500">Peak (Y)</p>
                <p className="text-lg font-semibold">{sampleData.metrics?.peakY?.toFixed(3) || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm font-medium text-blue-500">Crest Factor (Z)</p>
                <p className="text-lg font-semibold">{sampleData.metrics?.crestFactorZ?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-sm font-medium text-purple-500">Kurtosis (X)</p>
                <p className="text-lg font-semibold">{sampleData.metrics?.kurtosisX?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle>Save Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sampleName">Sample Name</Label>
              <Input
                id="sampleName"
                value={sampleName}
                onChange={(e) => setSampleName(e.target.value)}
                placeholder="Enter sample name"
                className="bg-input-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any observations or notes about this recording..."
                className="bg-input-background min-h-20"
              />
            </div>

            <div className="flex items-center space-x-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Checkbox
                id="baseline"
                checked={saveAsBaseline}
                onCheckedChange={(checked) => setSaveAsBaseline(checked === true)}
              />

              <div className="flex-1">
                <Label htmlFor="baseline" className="text-sm font-medium">
                  Save as new baseline
                </Label>
                <p className="text-xs text-muted-foreground">
                  This will replace the current baseline for future comparisons
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="grid grid-cols-1 gap-4"
      >
        <Button
          size="lg"
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 transition-all duration-300"
          onClick={handleSave}
          disabled={isSaving || !sampleName.trim()}
        >
          {isSaving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
            />
          ) : (
            <Save className="h-5 w-5 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save Sample'}
        </Button>

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isSaving}
            className="border-red-500/50 hover:border-red-500 hover:bg-red-500/10 text-red-500"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Discard
          </Button>
          
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={handleExportCSV}
            className="border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            variant="outline"
            disabled={isSaving}
            className="border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
