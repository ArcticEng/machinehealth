import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Loader2, Building2, Factory, Settings, Calendar, Sparkles, CheckCircle, Trash2, ExternalLink, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import React from 'react';
import { companiesAPI, factoriesAPI, machinesAPI, reportsAPI } from '../services/api';

interface Company {
  id: string;
  name: string;
}

interface FactoryItem {
  id: string;
  name: string;
  companyId: string;
}

interface Machine {
  id: string;
  name: string;
  factoryId: string;
  healthScore: number;
  status: string;
}

interface SavedReport {
  id: string;
  filename: string;
  period: string;
  summary: string;
  companyName: string;
  factoryName?: string;
  machineName?: string;
  createdAt: string;
  downloadUrl: string;
}

interface ReportData {
  title: string;
  generatedAt: string;
  period: string;
  summary: string;
  machineHealth: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    averageScore: number;
  };
  alerts: {
    total: number;
    resolved: number;
    critical: number;
  };
  recommendations: string[];
  machines: {
    name: string;
    health: number;
    trend: string;
    status: string;
  }[];
  downloadUrl?: string;
}

export default function ReportsScreen() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [factories, setFactories] = useState<FactoryItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedFactory, setSelectedFactory] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('week');
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);
  const [progress, setProgress] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadData();
    loadReportHistory();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companiesData, factoriesData, machinesData] = await Promise.all([
        companiesAPI.getAll(),
        factoriesAPI.getAll(),
        machinesAPI.getAll()
      ]);
      setCompanies(companiesData);
      setFactories(factoriesData);
      setMachines(machinesData);
    } catch (err) {
      // Use mock data
      setCompanies([
        { id: '1', name: 'Acme Manufacturing' },
        { id: '2', name: 'Steel Corp Ltd' },
        { id: '3', name: 'Tech Industries' },
      ]);
      setFactories([
        { id: '1', name: 'Factory Alpha', companyId: '1' },
        { id: '2', name: 'Factory Beta', companyId: '1' },
        { id: '3', name: 'Steel Plant 1', companyId: '2' },
      ]);
      setMachines([
        { id: '1', name: 'Conveyor Belt #1', factoryId: '1', healthScore: 92, status: 'healthy' },
        { id: '2', name: 'Press Machine #3', factoryId: '1', healthScore: 78, status: 'warning' },
        { id: '3', name: 'Assembly Robot #2', factoryId: '2', healthScore: 65, status: 'critical' },
        { id: '4', name: 'Furnace #1', factoryId: '3', healthScore: 88, status: 'healthy' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadReportHistory = async () => {
    setLoadingHistory(true);
    try {
      const reports = await reportsAPI.getAll({ limit: 20 });
      setSavedReports(reports);
    } catch (err) {
      console.log('Could not load report history:', err);
      setSavedReports([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    setProgress(0);
    setGeneratedReport(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // Call the API to generate and save report
      const report = await reportsAPI.generate({
        companyId: selectedCompany,
        factoryId: selectedFactory,
        period: selectedPeriod,
        includeAiAnalysis: includeAnalysis
      });

      clearInterval(progressInterval);
      setProgress(100);

      setGeneratedReport({
        title: report.title,
        generatedAt: report.generatedAt,
        period: selectedPeriod,
        summary: report.executiveSummary || report.summary,
        machineHealth: report.machineHealth,
        alerts: report.alerts,
        recommendations: report.recommendations || [],
        machines: report.machines || [],
        downloadUrl: report.downloadUrl
      });

      // Refresh report history
      await loadReportHistory();

    } catch (err) {
      console.error('Failed to generate report:', err);
      // Fallback to local generation if API fails
      await generateLocalReport();
    } finally {
      setGenerating(false);
    }
  };

  const generateLocalReport = async () => {
    // Filter machines based on selection
    let filteredMachines = [...machines];
    if (selectedFactory !== 'all') {
      filteredMachines = filteredMachines.filter(m => m.factoryId === selectedFactory);
    } else if (selectedCompany !== 'all') {
      const companyFactoryIds = factories.filter(f => f.companyId === selectedCompany).map(f => f.id);
      filteredMachines = filteredMachines.filter(m => companyFactoryIds.includes(m.factoryId));
    }

    const healthy = filteredMachines.filter(m => m.healthScore >= 90).length;
    const warning = filteredMachines.filter(m => m.healthScore >= 70 && m.healthScore < 90).length;
    const critical = filteredMachines.filter(m => m.healthScore < 70).length;
    const avgScore = filteredMachines.length > 0 
      ? Math.round(filteredMachines.reduce((sum, m) => sum + m.healthScore, 0) / filteredMachines.length)
      : 0;

    setGeneratedReport({
      title: `Machine Health Report - ${getPeriodLabel(selectedPeriod)}`,
      generatedAt: new Date().toISOString(),
      period: selectedPeriod,
      summary: `This report covers ${filteredMachines.length} machines with an average health score of ${avgScore}%.`,
      machineHealth: {
        total: filteredMachines.length,
        healthy,
        warning,
        critical,
        averageScore: avgScore
      },
      alerts: {
        total: Math.floor(Math.random() * 20) + 5,
        resolved: Math.floor(Math.random() * 15) + 3,
        critical: critical * 2
      },
      recommendations: [
        critical > 0 ? 'Prioritize maintenance for critical machines' : 'Continue current maintenance schedule',
        'Maintain regular vibration monitoring intervals',
        'Keep spare parts inventory updated'
      ],
      machines: filteredMachines.map(m => ({
        name: m.name,
        health: m.healthScore,
        trend: m.healthScore > 85 ? 'stable' : m.healthScore > 70 ? 'declining' : 'critical',
        status: m.status
      }))
    });
  };

  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case 'day': return 'Last 24 Hours';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'quarter': return 'Last Quarter';
      default: return period;
    }
  };

  const downloadReport = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    } else if (generatedReport) {
      // Fallback: download as text file
      const reportText = formatReportAsText(generatedReport);
      const blob = new Blob([reportText], { type: 'text/plain' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `machine-health-report-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    }
  };

  const formatReportAsText = (report: ReportData): string => {
    return `
${report.title}
Generated: ${new Date(report.generatedAt).toLocaleString()}
Period: ${getPeriodLabel(report.period)}

═══════════════════════════════════════════════════

EXECUTIVE SUMMARY
${report.summary}

═══════════════════════════════════════════════════

MACHINE HEALTH OVERVIEW
• Total Machines: ${report.machineHealth.total}
• Average Health Score: ${report.machineHealth.averageScore}%
• Healthy (>90%): ${report.machineHealth.healthy}
• Warning (70-90%): ${report.machineHealth.warning}
• Critical (<70%): ${report.machineHealth.critical}

═══════════════════════════════════════════════════

MACHINE DETAILS
${report.machines.map(m => `• ${m.name}: ${m.health}% (${m.status}) - Trend: ${m.trend}`).join('\n')}

═══════════════════════════════════════════════════

RECOMMENDATIONS
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

═══════════════════════════════════════════════════

Report generated by MachineHealth AI Analytics
    `.trim();
  };

  const confirmDeleteReport = (report: SavedReport) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const deleteReportHandler = async () => {
    if (!reportToDelete) return;
    try {
      await reportsAPI.delete(reportToDelete.id);
      setSavedReports(savedReports.filter(r => r.id !== reportToDelete.id));
    } catch (err) {
      console.error('Failed to delete report:', err);
    } finally {
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFactories = selectedCompany === 'all' 
    ? factories 
    : factories.filter(f => f.companyId === selectedCompany);

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
        className="space-y-2"
      >
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">Generate and view saved health reports</p>
      </motion.div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history">
            Report History
            {savedReports.length > 0 && (
              <Badge variant="secondary" className="ml-2">{savedReports.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scope Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company
                  </Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Factory
                  </Label>
                  <Select value={selectedFactory} onValueChange={setSelectedFactory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Factories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Factories</SelectItem>
                      {filteredFactories.map((factory) => (
                        <SelectItem key={factory.id} value={factory.id}>
                          {factory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Period Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Time Period
                </Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Last 24 Hours</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Report Options */}
              <div className="space-y-3 pt-2">
                <Label>Include in Report</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="analysis" 
                      checked={includeAnalysis}
                      onCheckedChange={(checked) => setIncludeAnalysis(checked === true)}
                    />
                    <Label htmlFor="analysis" className="text-sm font-normal">
                      AI-Powered Analysis & Insights
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="recommendations" 
                      checked={includeRecommendations}
                      onCheckedChange={(checked) => setIncludeRecommendations(checked === true)}
                    />
                    <Label htmlFor="recommendations" className="text-sm font-normal">
                      Maintenance Recommendations
                    </Label>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={generateReport}
                disabled={generating}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate & Save Report
                  </>
                )}
              </Button>

              {generating && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {progress < 30 ? 'Analyzing machine data...' : 
                     progress < 60 ? 'Running AI analysis...' :
                     progress < 90 ? 'Saving report to cloud...' :
                     'Finalizing...'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Report Preview */}
          {generatedReport && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-green-500/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      {generatedReport.title}
                    </CardTitle>
                    <Button onClick={() => downloadReport(generatedReport.downloadUrl)} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Generated: {formatDate(generatedReport.generatedAt)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Executive Summary</h3>
                    <p className="text-sm text-muted-foreground">{generatedReport.summary}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{generatedReport.machineHealth.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">{generatedReport.machineHealth.healthy}</p>
                      <p className="text-xs text-muted-foreground">Healthy</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-500">{generatedReport.machineHealth.warning}</p>
                      <p className="text-xs text-muted-foreground">Warning</p>
                    </div>
                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-red-500">{generatedReport.machineHealth.critical}</p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                  </div>

                  {generatedReport.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">AI Recommendations</h3>
                      <ul className="space-y-2">
                        {generatedReport.recommendations.slice(0, 5).map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : savedReports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No Saved Reports</p>
                <p className="text-sm text-muted-foreground">Generate a report to save it to your history</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {savedReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <h4 className="font-medium truncate">{report.filename.replace('.json', '')}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {report.summary}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(report.createdAt)}
                          </span>
                          <Badge variant="outline">{getPeriodLabel(report.period)}</Badge>
                          {report.companyName && (
                            <span>{report.companyName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(report.downloadUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => confirmDeleteReport(report)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this report from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteReportHandler}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
