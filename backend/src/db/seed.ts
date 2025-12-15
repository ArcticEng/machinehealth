import pool from './index';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create demo user
    const passwordHash = await bcrypt.hash('demo123', 10);
    const userId = uuidv4();
    
    await pool.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, subscription_tier)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, [userId, 'demo@example.com', passwordHash, 'John', 'Doe', 'admin', 'professional']);

    // Get the user (in case it already existed)
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@example.com']);
    const actualUserId = userResult.rows[0]?.id || userId;

    // Create demo companies
    const companies = [
      { name: 'Acme Manufacturing', description: 'Leading manufacturing company' },
      { name: 'Steel Corp Ltd', description: 'Steel production and processing' },
      { name: 'Tech Industries', description: 'High-tech machinery production' }
    ];

    const companyIds: string[] = [];
    for (const company of companies) {
      const companyId = uuidv4();
      await pool.query(`
        INSERT INTO companies (id, name, description, owner_id, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [companyId, company.name, company.description, actualUserId, 'active']);
      companyIds.push(companyId);
    }

    // Get actual company IDs
    const companiesResult = await pool.query('SELECT id, name FROM companies WHERE owner_id = $1', [actualUserId]);
    const actualCompanies = companiesResult.rows;

    // Create factories
    const factories = [
      { name: 'Factory Alpha', location: 'Detroit, MI', companyIndex: 0 },
      { name: 'Factory Beta', location: 'Chicago, IL', companyIndex: 0 },
      { name: 'Steel Plant 1', location: 'Pittsburgh, PA', companyIndex: 1 },
      { name: 'Steel Plant 2', location: 'Cleveland, OH', companyIndex: 1 },
      { name: 'Tech Facility A', location: 'Austin, TX', companyIndex: 2 },
      { name: 'Tech Facility B', location: 'San Jose, CA', companyIndex: 2 }
    ];

    const factoryIds: string[] = [];
    for (const factory of factories) {
      const factoryId = uuidv4();
      const companyId = actualCompanies[factory.companyIndex]?.id || companyIds[factory.companyIndex];
      if (companyId) {
        await pool.query(`
          INSERT INTO factories (id, company_id, name, location, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [factoryId, companyId, factory.name, factory.location, 'operational']);
        factoryIds.push(factoryId);
      }
    }

    // Get actual factory IDs
    const factoriesResult = await pool.query(`
      SELECT f.id, f.name FROM factories f
      JOIN companies c ON f.company_id = c.id
      WHERE c.owner_id = $1
    `, [actualUserId]);
    const actualFactories = factoriesResult.rows;

    // Create machines
    const machines = [
      { name: 'Conveyor Belt #1', type: 'Conveyor', factoryIndex: 0, health: 92 },
      { name: 'Press Machine #3', type: 'Press', factoryIndex: 0, health: 78 },
      { name: 'CNC Mill #1', type: 'CNC', factoryIndex: 0, health: 95 },
      { name: 'Assembly Robot #2', type: 'Robot', factoryIndex: 1, health: 65 },
      { name: 'Packaging Unit #1', type: 'Packaging', factoryIndex: 1, health: 88 },
      { name: 'Furnace #1', type: 'Furnace', factoryIndex: 2, health: 91 },
      { name: 'Crusher #2', type: 'Crusher', factoryIndex: 2, health: 42 },
      { name: 'Rolling Mill #1', type: 'Mill', factoryIndex: 3, health: 85 },
      { name: 'Laser Cutter #1', type: 'Laser', factoryIndex: 4, health: 97 },
      { name: '3D Printer #3', type: 'Printer', factoryIndex: 4, health: 89 },
      { name: 'Assembly Line #1', type: 'Assembly', factoryIndex: 5, health: 76 },
      { name: 'Quality Scanner #1', type: 'Scanner', factoryIndex: 5, health: 94 }
    ];

    const machineIds: string[] = [];
    for (const machine of machines) {
      const machineId = uuidv4();
      const factoryId = actualFactories[machine.factoryIndex]?.id || factoryIds[machine.factoryIndex];
      if (factoryId) {
        const status = machine.health >= 90 ? 'healthy' : machine.health >= 70 ? 'warning' : 'critical';
        await pool.query(`
          INSERT INTO machines (id, factory_id, name, type, status, health_score)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [machineId, factoryId, machine.name, machine.type, status, machine.health]);
        machineIds.push(machineId);
      }
    }

    // Get actual machine IDs
    const machinesResult = await pool.query(`
      SELECT m.id, m.name FROM machines m
      JOIN factories f ON m.factory_id = f.id
      JOIN companies c ON f.company_id = c.id
      WHERE c.owner_id = $1
    `, [actualUserId]);
    const actualMachines = machinesResult.rows;

    // Create some sample alerts
    if (actualMachines.length > 0) {
      const alerts = [
        {
          machineIndex: 0,
          type: 'critical',
          severity: 'high',
          title: 'High Vibration Detected',
          description: 'Vibration levels exceeded critical threshold (2.5g)',
          recommendation: 'Immediate inspection recommended. Check bearing alignment.'
        },
        {
          machineIndex: 1,
          type: 'warning',
          severity: 'medium',
          title: 'Temperature Alert',
          description: 'Operating temperature rising above normal range',
          recommendation: 'Monitor closely. Consider reducing load or improving ventilation.'
        },
        {
          machineIndex: 3,
          type: 'critical',
          severity: 'high',
          title: 'Bearing Failure Risk',
          description: 'High frequency vibration patterns indicate bearing wear',
          recommendation: 'Schedule bearing replacement within 2 weeks.'
        },
        {
          machineIndex: 6,
          type: 'critical',
          severity: 'high',
          title: 'Immediate Maintenance Required',
          description: 'Machine health critically low. Multiple anomalies detected.',
          recommendation: 'Stop machine immediately and perform full inspection.'
        }
      ];

      for (const alert of alerts) {
        const machineId = actualMachines[alert.machineIndex]?.id;
        if (machineId) {
          await pool.query(`
            INSERT INTO alerts (machine_id, type, severity, title, description, recommendation)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [machineId, alert.type, alert.severity, alert.title, alert.description, alert.recommendation]);
        }
      }
    }

    console.log('✅ Database seeded successfully');
    console.log('📧 Demo login: demo@example.com / demo123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
