import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Factory, Settings, TrendingUp, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import React from 'react';
import { type Screen } from '../constants/navigation';
import { analyticsAPI, alertsAPI } from '../services/api';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onNavigateToAssets: (tab: 'companies' | 'factories' | 'machines') => void;
  userName?: string;
}

interface DashboardData {
  companies: number;
  factories: number;
  machines: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  overallHealth: number;
  alerts: {
    unresolved: number;
    critical: number;
  };
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  machineName: string;
  factoryName: string;
  createdAt: string;
}

// Static chart data for demo
const healthData = [
  { time: '00:00', health: 95 },
  { time: '04:00', health: 93 },
  { time: '08:00', health: 89 },
  { time: '12:00', health: 91 },
  { time: '16:00', health: 87 },
  { time: '20:00', health: 84 },
  { time: '24:00', health: 82 },
];

const getHealthColor = (score: number) => {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  return 'text-red-500';
};

const getHealthGradient = (score: number) => {
  if (score >= 90) return 'from-green-500 to-green-400';
  if (score >= 70) return 'from-yellow-500 to-orange-500';
  return 'from-red-500 to-pink-500';
};

const getAlertIcon = (type: string, severity: string) => {
  if (type === 'critical' || severity === 'high') {
    return <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />;
  }
  if (type === 'warning' || severity === 'medium') {
    return <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />;
  }
  return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
};

const getAlertStyle = (type: string, severity: string) => {
  if (type === 'critical' || severity === 'high') {
    return 'bg-red-500/10 border-red-500/20';
  }
  if (type === 'warning' || severity === 'medium') {
    return 'bg-yellow-500/10 border-yellow-500/20';
  }
  return 'bg-green-500/10 border-green-500/20';
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

export default function HomeScreen({ onNavigate, onNavigateToAssets, userName }: HomeScreenProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardData, alertsData] = await Promise.all([
          analyticsAPI.getDashboard(),
          alertsAPI.getAll({ resolved: false })
        ]);
        setDashboard(dashboardData);
        setAlerts(alertsData.slice(0, 3)); // Show only first 3 alerts
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Use mock data if API fails
        setDashboard({
          companies: 3,
          factories: 6,
          machines: { total: 12, healthy: 8, warning: 3, critical: 1 },
          overallHealth: 82,
          alerts: { unresolved: 4, critical: 2 }
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const currentHealth = dashboard?.overallHealth || 82;

  return (
    <div className="p-4 space-y-6 pb-20 min-h-screen bg-background text-foreground">
      {/* Welcome Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome back, {userName || 'User'}</h1>
        <p className="text-muted-foreground">Monitor your asset health in real-time</p>
      </motion.div>

      {/* Overall Health Score */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <Card className="border-border shadow-lg bg-card text-card-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>My Overall Asset Health</span>
              <Badge
                variant="secondary"
                className={`${getHealthColor(currentHealth)} bg-gradient-to-r ${getHealthGradient(currentHealth)}/10 border-current/20`}
              >
                {currentHealth >= 90 ? 'Good' : currentHealth >= 70 ? 'Warning' : 'Critical'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${getHealthColor(currentHealth)}`}>{currentHealth}%</div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${currentHealth}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full bg-gradient-to-r ${getHealthGradient(currentHealth)} shadow-lg`}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Last updated 5 minutes ago</p>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthData}>
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={[60, 100]}
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
                  <Line
                    type="monotone"
                    dataKey="health"
                    stroke="url(#healthGradient)"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                  <defs>
                    <linearGradient id="healthGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" />
                      <stop offset="50%" stopColor="hsl(var(--secondary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="grid grid-cols-2 gap-4">
        <Card onClick={() => onNavigateToAssets('companies')} className="border-border shadow-lg cursor-pointer bg-card text-card-foreground">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Companies</span>
            </div>
            <p className="text-2xl font-semibold">{dashboard?.companies || 0}</p>
            <p className="text-xs text-muted-foreground">{dashboard?.alerts.critical || 0} active alerts</p>
          </CardContent>
        </Card>

        <Card onClick={() => onNavigateToAssets('factories')} className="border-border shadow-lg cursor-pointer bg-card text-card-foreground">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Factories</span>
            </div>
            <p className="text-2xl font-semibold">{dashboard?.factories || 0}</p>
            <p className="text-xs text-muted-foreground">{dashboard?.factories || 0} operational</p>
          </CardContent>
        </Card>

        <Card onClick={() => onNavigateToAssets('machines')} className="border-border shadow-lg cursor-pointer bg-card text-card-foreground">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Machines</span>
            </div>
            <p className="text-2xl font-semibold">{dashboard?.machines.total || 0}</p>
            <p className="text-xs text-muted-foreground">{dashboard?.machines.healthy || 0} healthy</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-lg bg-card text-card-foreground">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Efficiency</span>
            </div>
            <p className="text-2xl font-semibold">92%</p>
            <p className="text-xs text-muted-foreground">+2% vs last week</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Alerts */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
        <Card className="border-border shadow-lg bg-card text-card-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Recent Alerts</span>
              {(dashboard?.alerts.unresolved || 0) > 0 && (
                <Badge variant="destructive">{dashboard?.alerts.unresolved} unresolved</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`flex items-center gap-3 p-3 border rounded-lg ${getAlertStyle(alert.type, alert.severity)}`}
                >
                  {getAlertIcon(alert.type, alert.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.factoryName}, {alert.machineName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTimeAgo(alert.createdAt)}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">All Clear</p>
                  <p className="text-xs text-muted-foreground">No active alerts</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
        <Card className="border-border shadow-lg bg-card text-card-foreground">
          <CardHeader className="pb-[0px] pt-[21px] pr-[21px] pl-[21px]">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-16 flex flex-col gap-2 bg-primary/10 border-primary/20 hover:border-primary transition-all duration-300"
                onClick={() => onNavigate('assets')}
              >
                <Building2 className="h-6 w-6 text-primary" />
                <span className="text-sm">Asset Structure</span>
              </Button>

              <Button
                variant="outline"
                className="h-16 flex flex-col gap-2 bg-secondary/10 border-secondary/20 hover:border-secondary transition-all duration-300"
                onClick={() => onNavigate('subscription')}
              >
                <Users className="h-6 w-6 text-secondary" />
                <span className="text-sm">Subscription</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
