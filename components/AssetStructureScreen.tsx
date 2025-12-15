import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, Factory, Settings, Edit, Trash2, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import React from 'react';
import { companiesAPI, factoriesAPI, machinesAPI } from '../services/api';

interface Company {
  id: string;
  name: string;
  description?: string;
  status: string;
  factoryCount: number;
  machineCount: number;
}

interface FactoryItem {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  location?: string;
  description?: string;
  status: string;
  machineCount: number;
}

interface Machine {
  id: string;
  name: string;
  factoryId: string;
  factoryName: string;
  type?: string;
  model?: string;
  status: string;
  healthScore: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'operational':
    case 'active':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'warning':
    case 'maintenance':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const getHealthColor = (health: number) => {
  if (health >= 90) return 'text-green-500';
  if (health >= 70) return 'text-yellow-500';
  return 'text-red-500';
};

interface AssetStructureScreenProps {
  defaultTab?: 'companies' | 'factories' | 'machines';
}

export default function AssetStructureScreen({ defaultTab = 'companies' }: AssetStructureScreenProps) {
  // Data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [factories, setFactories] = useState<FactoryItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [factoryDialogOpen, setFactoryDialogOpen] = useState(false);
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Edit state
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingFactory, setEditingFactory] = useState<FactoryItem | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string; name: string } | null>(null);

  // Form state
  const [companyForm, setCompanyForm] = useState({ name: '', description: '' });
  const [factoryForm, setFactoryForm] = useState({ name: '', companyId: '', location: '', description: '' });
  const [machineForm, setMachineForm] = useState({ name: '', factoryId: '', type: '', model: '' });
  const [saving, setSaving] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [companiesData, factoriesData, machinesData] = await Promise.all([
        companiesAPI.getAll(),
        factoriesAPI.getAll(),
        machinesAPI.getAll()
      ]);
      setCompanies(companiesData);
      setFactories(factoriesData);
      setMachines(machinesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      // Use mock data if API fails
      setCompanies([
        { id: '1', name: 'Acme Manufacturing', status: 'active', factoryCount: 2, machineCount: 20 },
        { id: '2', name: 'Steel Corp Ltd', status: 'active', factoryCount: 1, machineCount: 15 },
        { id: '3', name: 'Tech Industries', status: 'maintenance', factoryCount: 1, machineCount: 10 },
      ]);
      setFactories([
        { id: '1', name: 'Factory Alpha', companyId: '1', companyName: 'Acme Manufacturing', location: 'Detroit, MI', status: 'operational', machineCount: 12 },
        { id: '2', name: 'Factory Beta', companyId: '1', companyName: 'Acme Manufacturing', location: 'Chicago, IL', status: 'operational', machineCount: 8 },
        { id: '3', name: 'Steel Plant 1', companyId: '2', companyName: 'Steel Corp Ltd', location: 'Pittsburgh, PA', status: 'maintenance', machineCount: 15 },
        { id: '4', name: 'Tech Facility', companyId: '3', companyName: 'Tech Industries', location: 'Austin, TX', status: 'operational', machineCount: 10 },
      ]);
      setMachines([
        { id: '1', name: 'Conveyor Belt #1', factoryId: '1', factoryName: 'Factory Alpha', type: 'Conveyor', status: 'healthy', healthScore: 92 },
        { id: '2', name: 'Press Machine #3', factoryId: '1', factoryName: 'Factory Alpha', type: 'Press', status: 'warning', healthScore: 78 },
        { id: '3', name: 'Assembly Robot #2', factoryId: '2', factoryName: 'Factory Beta', type: 'Robot', status: 'critical', healthScore: 65 },
        { id: '4', name: 'Packaging Unit #1', factoryId: '2', factoryName: 'Factory Beta', type: 'Packaging', status: 'healthy', healthScore: 95 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Company CRUD
  const openAddCompany = () => {
    setEditingCompany(null);
    setCompanyForm({ name: '', description: '' });
    setCompanyDialogOpen(true);
  };

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({ name: company.name, description: company.description || '' });
    setCompanyDialogOpen(true);
  };

  const saveCompany = async () => {
    if (!companyForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingCompany) {
        await companiesAPI.update(editingCompany.id, companyForm);
      } else {
        await companiesAPI.create(companyForm);
      }
      await loadData();
      setCompanyDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Factory CRUD
  const openAddFactory = () => {
    setEditingFactory(null);
    setFactoryForm({ name: '', companyId: companies[0]?.id || '', location: '', description: '' });
    setFactoryDialogOpen(true);
  };

  const openEditFactory = (factory: FactoryItem) => {
    setEditingFactory(factory);
    setFactoryForm({ 
      name: factory.name, 
      companyId: factory.companyId, 
      location: factory.location || '', 
      description: factory.description || '' 
    });
    setFactoryDialogOpen(true);
  };

  const saveFactory = async () => {
    if (!factoryForm.name.trim() || !factoryForm.companyId) return;
    setSaving(true);
    try {
      if (editingFactory) {
        await factoriesAPI.update(editingFactory.id, factoryForm);
      } else {
        await factoriesAPI.create(factoryForm);
      }
      await loadData();
      setFactoryDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Machine CRUD
  const openAddMachine = () => {
    setEditingMachine(null);
    setMachineForm({ name: '', factoryId: factories[0]?.id || '', type: '', model: '' });
    setMachineDialogOpen(true);
  };

  const openEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setMachineForm({ 
      name: machine.name, 
      factoryId: machine.factoryId, 
      type: machine.type || '', 
      model: machine.model || '' 
    });
    setMachineDialogOpen(true);
  };

  const saveMachine = async () => {
    if (!machineForm.name.trim() || !machineForm.factoryId) return;
    setSaving(true);
    try {
      if (editingMachine) {
        await machinesAPI.update(editingMachine.id, machineForm);
      } else {
        await machinesAPI.create(machineForm);
      }
      await loadData();
      setMachineDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const openDelete = (type: string, id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setSaving(true);
    try {
      switch (deletingItem.type) {
        case 'company':
          await companiesAPI.delete(deletingItem.id);
          break;
        case 'factory':
          await factoriesAPI.delete(deletingItem.id);
          break;
        case 'machine':
          await machinesAPI.delete(deletingItem.id);
          break;
      }
      await loadData();
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
        className="space-y-2"
      >
        <h1 className="text-2xl font-semibold">Asset Structure</h1>
        <p className="text-muted-foreground">Manage your companies, factories, and machines</p>
      </motion.div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="factories">Factories</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Companies ({companies.length})</h3>
              <Button 
                onClick={openAddCompany}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </div>

            <div className="grid gap-4">
              {companies.map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">{company.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {company.factoryCount} factories • {company.machineCount} machines
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(company.status)}>
                            {company.status}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => openEditCompany(company)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => openDelete('company', company.id, company.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Factories Tab */}
          <TabsContent value="factories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Factories ({factories.length})</h3>
              <Button 
                onClick={openAddFactory}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Factory
              </Button>
            </div>

            <div className="grid gap-4">
              {factories.map((factory, index) => (
                <motion.div
                  key={factory.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <Factory className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">{factory.name}</h4>
                            <p className="text-sm text-muted-foreground">{factory.companyName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{factory.location || 'No location'}</span>
                              <span>•</span>
                              <span>{factory.machineCount} machines</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(factory.status)}>
                            {factory.status}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => openEditFactory(factory)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => openDelete('factory', factory.id, factory.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Machines Tab */}
          <TabsContent value="machines" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Machines ({machines.length})</h3>
              <Button 
                onClick={openAddMachine}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </Button>
            </div>

            <div className="grid gap-4">
              {machines.map((machine, index) => (
                <motion.div
                  key={machine.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <Settings className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">{machine.name}</h4>
                            <p className="text-sm text-muted-foreground">{machine.factoryName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Type: {machine.type || 'N/A'}</span>
                              <span>•</span>
                              <span className={getHealthColor(machine.healthScore)}>
                                Health: {machine.healthScore}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(machine.status)}>
                            {machine.status}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => openEditMachine(machine)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => openDelete('machine', machine.id, machine.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add Company'}</DialogTitle>
            <DialogDescription>
              {editingCompany ? 'Update company details' : 'Create a new company'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Name *</Label>
              <Input
                id="company-name"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-desc">Description</Label>
              <Textarea
                id="company-desc"
                value={companyForm.description}
                onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                placeholder="Company description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCompany} disabled={saving || !companyForm.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCompany ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Factory Dialog */}
      <Dialog open={factoryDialogOpen} onOpenChange={setFactoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFactory ? 'Edit Factory' : 'Add Factory'}</DialogTitle>
            <DialogDescription>
              {editingFactory ? 'Update factory details' : 'Create a new factory'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="factory-name">Name *</Label>
              <Input
                id="factory-name"
                value={factoryForm.name}
                onChange={(e) => setFactoryForm({ ...factoryForm, name: e.target.value })}
                placeholder="Factory name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factory-company">Company *</Label>
              <Select 
                value={factoryForm.companyId} 
                onValueChange={(value) => setFactoryForm({ ...factoryForm, companyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="factory-location">Location</Label>
              <Input
                id="factory-location"
                value={factoryForm.location}
                onChange={(e) => setFactoryForm({ ...factoryForm, location: e.target.value })}
                placeholder="City, State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factory-desc">Description</Label>
              <Textarea
                id="factory-desc"
                value={factoryForm.description}
                onChange={(e) => setFactoryForm({ ...factoryForm, description: e.target.value })}
                placeholder="Factory description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFactoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveFactory} disabled={saving || !factoryForm.name.trim() || !factoryForm.companyId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingFactory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machine Dialog */}
      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMachine ? 'Edit Machine' : 'Add Machine'}</DialogTitle>
            <DialogDescription>
              {editingMachine ? 'Update machine details' : 'Create a new machine'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="machine-name">Name *</Label>
              <Input
                id="machine-name"
                value={machineForm.name}
                onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                placeholder="Machine name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-factory">Factory *</Label>
              <Select 
                value={machineForm.factoryId} 
                onValueChange={(value) => setMachineForm({ ...machineForm, factoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a factory" />
                </SelectTrigger>
                <SelectContent>
                  {factories.map((factory) => (
                    <SelectItem key={factory.id} value={factory.id}>
                      {factory.name} ({factory.companyName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-type">Type</Label>
              <Input
                id="machine-type"
                value={machineForm.type}
                onChange={(e) => setMachineForm({ ...machineForm, type: e.target.value })}
                placeholder="e.g., Conveyor, Press, Robot"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-model">Model</Label>
              <Input
                id="machine-model"
                value={machineForm.model}
                onChange={(e) => setMachineForm({ ...machineForm, model: e.target.value })}
                placeholder="Model number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMachineDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveMachine} disabled={saving || !machineForm.name.trim() || !machineForm.factoryId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingMachine ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingItem?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
