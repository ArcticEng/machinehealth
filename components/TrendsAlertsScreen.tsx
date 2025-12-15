import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, TrendingDown, TrendingUp, Bell, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import React from 'react';
import { machinesAPI, alertsAPI, analyticsAPI } from '../services/api';

interface Machine {
  id: string;
  name: string;
  factoryName: string;
  healthScore: number;
}

interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  machineName: string;
  factoryName: string;
  isAcknowledged: boolean;
  resolved: boolean;
  createdAt: string;
}

interface TrendData {
  time: string;
  health: number;
  color?: string;
}

export default function TrendsAlertsScreen() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('daily');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [alertDistribution, setAlertDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthChange, setHealthChange] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTrends();
  }, [selectedMachine, selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [machinesData, alertsData] = await Promise.all([
        machinesAPI.getAll(),
        alertsAPI.getAll()
      ]);
      setMachines(machinesData);
      setAlerts(alertsData);
    } catch (err) {
      // Use mock data
      setMachines([
        { id: 'mock-1', name: 'Conveyor Belt #1', factoryName: 'Factory Alpha', healthScore: 92 },
        { id: 'mock-2', name: 'Press Machine #3', factoryName: 'Factory Alpha', healthScore: 78 },
        { id: 'mock-3', name: 'Assembly Robot #2', factoryName: 'Factory Beta', healthScore: 65 },
      ]);
      setAlerts(generateMockAlerts());
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const data = await analyticsAPI.getHealthTrends(
        selectedMachine === 'all' ? undefined : selectedMachine,
        selectedPeriod === 'daily' ? 'day' : selectedPeriod === 'weekly' ? 'week' : 'month'
      );
      
      if (data.length > 0) {
        const formattedData = data.map((d: any) => ({
          time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          health: Math.round((100 - (d.avgRmsX + d.avgRmsY + d.avgRmsZ) * 10)),
        }));
        setTrendData(formattedData);
        
        // Calculate health change
        if (formattedData.length >= 2) {
          const first = formattedData[0].health;
          const last = formattedData[formattedData.length - 1].health;
          setHealthChange(((last - first) / first) * 100);
        }
      } else {
        setTrendData(generateMockTrendData());
      }
    } catch (err) {
      setTrendData(generateMockTrendData());
    }

    // Generate alert distribution
    setAlertDistribution(generateAlertDistribution());
  };

  const generateMockAlerts = (): AlertItem[] => {
    return [
      {
        id: '1',
        type: 'vibration',
        severity: 'high',
        title: 'High Vibration Detected',
        description: 'Vibration levels exceeded threshold by 45%',
        machineName: 'Press Machine #3',
        factoryName: 'Factory Alpha',
        isAcknowledged: false,
        resolved: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        type: 'maintenance',
        severity: 'medium',
        title: 'Maintenance Due',
        description: 'Scheduled maintenance overdue by 3 days',
        machineName: 'Conveyor Belt #1',
        factoryName: 'Factory Alpha',
        isAcknowledged: true,
        resolved: false,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '3',
        type: 'health',
        severity: 'high',
        title: 'Critical Health Score',
        description: 'Machine health dropped below 70%',
        machineName: 'Assembly Robot #2',
        factoryName: 'Factory Beta',
        isAcknowledged: false,
        resolved: false,
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '4',
        type: 'vibration',
        severity: 'low',
        title: 'Minor Vibration Increase',
        description: 'Slight increase in Z-axis vibration',
        machineName: 'Packaging Unit #1',
        factoryName: 'Factory Beta',
        isAcknowledged: true,
        resolved: true,
        createdAt: new Date(Date.now() - 172800000).toISOString()
      },
    ];
  };

  const generateMockTrendData = (): TrendData[] => {
    const points = selectedPeriod === 'daily' ? 8 : selectedPeriod === 'weekly' ? 7 : 30;
    const data: TrendData[] = [];
    let health = 97;
    
    for (let i = 0; i < points; i++) {
      health = Math.max(60, Math.min(100, health - Math.random() * 3 + 0.5));
      const time = selectedPeriod === 'daily' 
        ? `${(i * 3).toString().padStart(2, '0')}:00`
        : selectedPeriod === 'weekly'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]
        : `Day ${i + 1}`;
      
      data.push({
        time,
        health: Math.round(health),
        color: health > 90 ? '#10b981' : health > 70 ? '#f59e0b' : '#ef4444'
      });
    }
    
    // Calculate change
    setHealthChange(((data[data.length - 1].health - data[0].health) / data[0].health) * 100);
    
    return data;
  };

  const generateAlertDistribution = () => {
    const days = selectedPeriod === 'daily' ? 8 : 7;
    return Array.from({ length: days }, (_, i) => ({
      time: selectedPeriod === 'daily' 
        ? `${(i * 3).toString().padStart(2, '0')}:00`
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      alerts: Math.floor(Math.random() * 5)
    }));
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await alertsAPI.acknowledge(alertId);
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, isAcknowledged: true } : a));
    } catch (err) {
      // Update locally for mock
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, isAcknowledged: true } : a));
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await alertsAPI.resolve(alertId);
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    } catch (err) {
      // Update locally for mock
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <Bell className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const criticalCount = unresolvedAlerts.filter(a => a.severity === 'high').length;

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
        <h1 className="text-2xl font-semibold">Trends & Alerts</h1>
        
        <div className="flex items-center gap-2">
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All machines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machines</SelectItem>
              {machines.map((machine) => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Period Tabs */}
      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-4">
          {/* Health Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Health Trend
                </CardTitle>
                <div className={`flex items-center gap-1 ${healthChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {healthChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="font-medium">{healthChange >= 0 ? '+' : ''}{healthChange.toFixed(1)}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="health" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      fill="url(#healthGradient)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="health" 
                      stroke="url(#lineGradient)"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    />
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981"/>
                        <stop offset="50%" stopColor="#f59e0b"/>
                        <stop offset="100%" stopColor="#ef4444"/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Alert Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Alert Distribution ({selectedPeriod})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={alertDistribution}>
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="alerts" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Active Alerts
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} critical</Badge>
            )}
          </h2>
          <span className="text-sm text-muted-foreground">{unresolvedAlerts.length} unresolved</span>
        </div>

        <div className="space-y-3">
          {unresolvedAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium">All Clear!</p>
                <p className="text-sm text-muted-foreground">No active alerts</p>
              </CardContent>
            </Card>
          ) : (
            unresolvedAlerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${alert.severity === 'high' ? 'border-l-red-500' : alert.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium truncate">{alert.title}</h4>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {alert.machineName} • {formatTimeAgo(alert.createdAt)}
                        </span>
                        <div className="flex gap-2">
                          {!alert.isAcknowledged && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
