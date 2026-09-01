import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROLES = new Set(['manager', 'technician', 'admin']);
const EQUIPMENT_STATES = new Set(['operational', 'fault', 'offline']);
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'marketops_session';

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

export function createPasswordRecord(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function passwordMatches(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf('=');
        return separator === -1
          ? [entry, '']
          : [entry.slice(0, separator), decodeURIComponent(entry.slice(separator + 1))];
      }),
  );
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    branchId: row.branch_id,
    branchName: row.branch_name || null,
  };
}

function httpError(status, message, fields) {
  const error = new Error(message);
  error.status = status;
  error.fields = fields;
  return error;
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(httpError(403, 'No tienes permisos para realizar esta acción.'));
      return;
    }
    next();
  };
}

function runTransaction(db, action) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function initializeDatabase(databasePath) {
  if (databasePath !== ':memory:') {
    mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      commune TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('manager', 'technician', 'admin')),
      branch_id INTEGER REFERENCES branches(id),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK ((role = 'manager' AND branch_id IS NOT NULL) OR role != 'manager')
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY,
      branch_id INTEGER NOT NULL REFERENCES branches(id),
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('checkout', 'scale', 'printer')),
      status TEXT NOT NULL CHECK (status IN ('operational', 'fault', 'offline')),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY,
      equipment_id INTEGER NOT NULL REFERENCES equipment(id),
      reported_by INTEGER NOT NULL REFERENCES users(id),
      resolved_by INTEGER REFERENCES users(id),
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
      reported_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution_notes TEXT,
      CHECK (resolved_at IS NULL OR resolved_at >= reported_at)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_role_branch ON users(role, branch_id);
    CREATE INDEX IF NOT EXISTS idx_equipment_branch_status ON equipment(branch_id, status);
    CREATE INDEX IF NOT EXISTS idx_incidents_equipment_status ON incidents(equipment_id, status);
    CREATE INDEX IF NOT EXISTS idx_incidents_reported_at ON incidents(reported_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);
  seedDatabase(db);
  db.exec('PRAGMA optimize');
  return db;
}

function seedDatabase(db) {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM branches').get().count;
  if (existing > 0) return;

  const createdAt = nowIso();
  const branches = [
    ['Providencia', 'Av. Nueva Providencia 1881', 'Providencia'],
    ['Ñuñoa', 'Av. Irarrázaval 3250', 'Ñuñoa'],
    ['Las Condes', 'Av. Apoquindo 4501', 'Las Condes'],
    ['Santiago Centro', 'Huérfanos 1055', 'Santiago'],
    ['La Florida', 'Av. Vicuña Mackenna 7255', 'La Florida'],
    ['Maipú', 'Av. Pajaritos 3020', 'Maipú'],
  ];
  const insertBranch = db.prepare(
    'INSERT INTO branches (name, address, commune, created_at) VALUES (?, ?, ?, ?)',
  );
  branches.forEach((branch) => insertBranch.run(...branch, createdAt));

  const demoPassword = 'MarketOps2026!';
  const users = [
    ['Camila Soto', 'encargado@marketops.cl', 'manager', 1],
    ['Diego Morales', 'tecnico@marketops.cl', 'technician', null],
    ['Valentina Reyes', 'admin@marketops.cl', 'admin', null],
  ];
  const insertUser = db.prepare(`
    INSERT INTO users
      (name, email, password_hash, password_salt, role, branch_id, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  users.forEach(([name, email, role, branchId]) => {
    const password = createPasswordRecord(demoPassword);
    insertUser.run(name, email, password.hash, password.salt, role, branchId, createdAt, createdAt);
  });

  const equipmentTemplates = [
    ['Caja 01', 'checkout'],
    ['Caja 02', 'checkout'],
    ['Caja 03', 'checkout'],
    ['Caja 04', 'checkout'],
    ['Balanza 01', 'scale'],
    ['Balanza 02', 'scale'],
    ['Impresora 01', 'printer'],
  ];
  const insertEquipment = db.prepare(`
    INSERT INTO equipment (branch_id, code, name, type, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let equipmentId = 1;
  for (let branchId = 1; branchId <= branches.length; branchId += 1) {
    equipmentTemplates.forEach(([name, type], index) => {
      let status = 'operational';
      if ([4, 12, 23, 31, 39].includes(equipmentId)) status = 'fault';
      if ([18, 35].includes(equipmentId)) status = 'offline';
      const code = `S${String(branchId).padStart(2, '0')}-${type.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(2, '0')}`;
      insertEquipment.run(branchId, code, name, type, status, createdAt);
      equipmentId += 1;
    });
  }

  const insertIncident = db.prepare(`
    INSERT INTO incidents
      (equipment_id, reported_by, resolved_by, description, severity, status, reported_at, resolved_at, resolution_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const incidents = [
    [4, 1, null, 'La caja no reconoce pagos con tarjeta y muestra error de conexión.', 'critical', 'open', hoursAgo(1), null, null],
    [12, 2, null, 'La balanza entrega lecturas inestables durante el pesaje.', 'high', 'open', hoursAgo(5), null, null],
    [23, 2, null, 'La impresora deja los comprobantes incompletos.', 'medium', 'open', hoursAgo(9), null, null],
    [31, 2, null, 'La caja se reinicia al cerrar una venta.', 'high', 'open', hoursAgo(20), null, null],
    [39, 2, null, 'La balanza no enciende después del corte eléctrico.', 'critical', 'open', hoursAgo(26), null, null],
    [6, 1, 2, 'La balanza no calibraba correctamente.', 'medium', 'resolved', hoursAgo(72), hoursAgo(70), 'Se recalibró el equipo y se verificaron diez pesajes.'],
    [9, 2, 2, 'La caja perdió conectividad con el servicio de pagos.', 'high', 'resolved', hoursAgo(96), hoursAgo(93), 'Se reemplazó el cable de red y se validó la conexión.'],
    [28, 2, 2, 'Atasco recurrente de papel en la impresora.', 'low', 'resolved', hoursAgo(120), hoursAgo(118), 'Limpieza de rodillos y cambio de papel.'],
  ];
  incidents.forEach((incident) => insertIncident.run(...incident));
}

function audit(db, userId, action, entityType, entityId, details = null) {
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, action, entityType, entityId, details, nowIso());
}

function mapIncident(row) {
  return {
    id: row.id,
    description: row.description,
    severity: row.severity,
    status: row.status,
    reportedAt: row.reported_at,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentCode: row.equipment_code,
    equipmentStatus: row.equipment_status,
    branchId: row.branch_id,
    branchName: row.branch_name,
    reportedBy: row.reported_by_name,
    resolvedBy: row.resolved_by_name,
  };
}

function incidentQuery(where = '') {
  return `
    SELECT i.*, e.name AS equipment_name, e.code AS equipment_code,
      e.status AS equipment_status, b.id AS branch_id, b.name AS branch_name,
      reporter.name AS reported_by_name, resolver.name AS resolved_by_name
    FROM incidents i
    JOIN equipment e ON e.id = i.equipment_id
    JOIN branches b ON b.id = e.branch_id
    JOIN users reporter ON reporter.id = i.reported_by
    LEFT JOIN users resolver ON resolver.id = i.resolved_by
    ${where}
  `;
}

export function createApp(options = {}) {
  const dataDir = options.dataDir || process.env.MARKETOPS_DATA_DIR || path.join(__dirname, 'data');
  const databasePath = options.databasePath || path.join(dataDir, 'marketops.db');
  const staticDir = options.staticDir === null
    ? null
    : options.staticDir || path.join(__dirname, 'dist', 'public');
  const secureCookie = options.secureCookie ?? process.env.COOKIE_SECURE === 'true';
  const db = initializeDatabase(databasePath);
  const app = express();
  app.locals.db = db;

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  app.use((req, _res, next) => {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!token) {
      next();
      return;
    }
    const row = db.prepare(`
      SELECT u.*, b.name AS branch_name
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
    `).get(tokenHash(token), nowIso());
    if (row) req.user = publicUser(row);
    next();
  });

  const requireAuth = (req, _res, next) => {
    if (!req.user) {
      next(httpError(401, 'Debes iniciar sesión para continuar.'));
      return;
    }
    next();
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'marketops', time: nowIso() });
  });

  app.post('/api/login', (req, res, next) => {
    try {
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');
      if (!email || !password) {
        throw httpError(400, 'Ingresa correo y contraseña.', {
          email: !email ? 'El correo es obligatorio.' : undefined,
          password: !password ? 'La contraseña es obligatoria.' : undefined,
        });
      }
      const row = db.prepare(`
        SELECT u.*, b.name AS branch_name
        FROM users u LEFT JOIN branches b ON b.id = u.branch_id
        WHERE u.email = ?
      `).get(email);
      if (!row || !row.active || !passwordMatches(password, row.password_salt, row.password_hash)) {
        throw httpError(401, 'Correo o contraseña incorrectos.');
      }
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
      db.prepare(`
        INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run(tokenHash(token), row.id, expiresAt, nowIso());
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookie,
        maxAge: SESSION_DURATION_MS,
        path: '/',
      });
      audit(db, row.id, 'login', 'session', null);
      res.json({ user: publicUser(row) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/logout', requireAuth, (req, res) => {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
    res.clearCookie(COOKIE_NAME, { path: '/' });
    audit(db, req.user.id, 'logout', 'session', null);
    res.status(204).end();
  });

  app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

  app.get('/api/dashboard', requireAuth, (req, res) => {
    const branchClause = req.user.role === 'manager' ? 'WHERE e.branch_id = ?' : '';
    const params = req.user.role === 'manager' ? [req.user.branchId] : [];
    const equipment = db.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END) AS operational,
        SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) AS fault,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) AS offline
      FROM equipment e ${branchClause}
    `).get(...params);
    const incidentBranchClause = req.user.role === 'manager' ? 'AND e.branch_id = ?' : '';
    const incidents = db.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN i.status = 'open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN i.status = 'open' AND i.severity = 'critical' THEN 1 ELSE 0 END) AS critical
      FROM incidents i JOIN equipment e ON e.id = i.equipment_id
      WHERE 1 = 1 ${incidentBranchClause}
    `).get(...params);
    const branches = db.prepare(`
      SELECT b.id, b.name, b.address, b.commune,
        COUNT(DISTINCT e.id) AS equipmentTotal,
        SUM(CASE WHEN e.status = 'operational' THEN 1 ELSE 0 END) AS operational,
        SUM(CASE WHEN e.status = 'fault' THEN 1 ELSE 0 END) AS fault,
        SUM(CASE WHEN e.status = 'offline' THEN 1 ELSE 0 END) AS offline,
        COUNT(DISTINCT CASE WHEN i.status = 'open' THEN i.id END) AS openIncidents,
        COUNT(DISTINCT CASE WHEN i.status = 'open' AND i.severity = 'critical' THEN i.id END) AS criticalIncidents
      FROM branches b
      LEFT JOIN equipment e ON e.branch_id = b.id
      LEFT JOIN incidents i ON i.equipment_id = e.id
      ${req.user.role === 'manager' ? 'WHERE b.id = ?' : ''}
      GROUP BY b.id ORDER BY criticalIncidents DESC, openIncidents DESC, b.name
    `).all(...params);
    const recent = db.prepare(
      incidentQuery(`WHERE 1 = 1 ${req.user.role === 'manager' ? 'AND e.branch_id = ?' : ''} ORDER BY i.reported_at DESC LIMIT 6`),
    ).all(...params).map(mapIncident);
    res.json({
      equipment: {
        total: Number(equipment.total || 0),
        operational: Number(equipment.operational || 0),
        fault: Number(equipment.fault || 0),
        offline: Number(equipment.offline || 0),
      },
      incidents: {
        total: Number(incidents.total || 0),
        open: Number(incidents.open || 0),
        critical: Number(incidents.critical || 0),
      },
      branches: branches.map((branch) => ({ ...branch })),
      recent,
    });
  });

  app.get('/api/branches', requireAuth, (req, res) => {
    const rows = req.user.role === 'manager'
      ? db.prepare('SELECT * FROM branches WHERE id = ?').all(req.user.branchId)
      : db.prepare('SELECT * FROM branches ORDER BY name').all();
    res.json({ branches: rows.map((row) => ({ ...row })) });
  });

  app.get('/api/equipment', requireAuth, (req, res) => {
    const conditions = [];
    const params = [];
    if (req.user.role === 'manager') {
      conditions.push('e.branch_id = ?');
      params.push(req.user.branchId);
    } else if (req.query.branchId) {
      conditions.push('e.branch_id = ?');
      params.push(Number(req.query.branchId));
    }
    if (req.query.status && EQUIPMENT_STATES.has(req.query.status)) {
      conditions.push('e.status = ?');
      params.push(req.query.status);
    }
    if (req.query.type && ['checkout', 'scale', 'printer'].includes(req.query.type)) {
      conditions.push('e.type = ?');
      params.push(req.query.type);
    }
    if (req.query.q) {
      conditions.push('(e.name LIKE ? OR e.code LIKE ?)');
      const query = `%${cleanText(req.query.q, 50)}%`;
      params.push(query, query);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT e.id, e.branch_id AS branchId, b.name AS branchName, e.code, e.name,
        e.type, e.status, e.updated_at AS updatedAt,
        COUNT(CASE WHEN i.status = 'open' THEN 1 END) AS openIncidents
      FROM equipment e
      JOIN branches b ON b.id = e.branch_id
      LEFT JOIN incidents i ON i.equipment_id = e.id
      ${where}
      GROUP BY e.id ORDER BY b.name, e.type, e.name
    `).all(...params);
    res.json({ equipment: rows.map((row) => ({ ...row })) });
  });

  app.patch('/api/equipment/:id', requireAuth, requireRole('technician'), (req, res, next) => {
    try {
      const equipmentId = Number(req.params.id);
      const status = req.body.status;
      if (!EQUIPMENT_STATES.has(status)) {
        throw httpError(400, 'Selecciona un estado válido.', { status: 'Estado inválido.' });
      }
      const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId);
      if (!equipment) throw httpError(404, 'El equipo no existe.');
      db.prepare('UPDATE equipment SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, nowIso(), equipmentId);
      audit(db, req.user.id, 'update_status', 'equipment', equipmentId, status);
      res.json({ id: equipmentId, status });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/incidents', requireAuth, (req, res) => {
    const conditions = [];
    const params = [];
    if (req.user.role === 'manager') {
      conditions.push('e.branch_id = ?');
      params.push(req.user.branchId);
    } else if (req.query.branchId) {
      conditions.push('e.branch_id = ?');
      params.push(Number(req.query.branchId));
    }
    if (req.query.status && ['open', 'resolved'].includes(req.query.status)) {
      conditions.push('i.status = ?');
      params.push(req.query.status);
    }
    if (req.query.severity && SEVERITIES.has(req.query.severity)) {
      conditions.push('i.severity = ?');
      params.push(req.query.severity);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`${incidentQuery(where)} ORDER BY i.reported_at DESC`).all(...params);
    res.json({ incidents: rows.map(mapIncident) });
  });

  app.post('/api/incidents', requireAuth, requireRole('manager', 'technician'), (req, res, next) => {
    try {
      const equipmentId = Number(req.body.equipmentId);
      const description = cleanText(req.body.description, 800);
      const severity = req.body.severity;
      if (!Number.isInteger(equipmentId)) {
        throw httpError(400, 'Selecciona un equipo.', { equipmentId: 'El equipo es obligatorio.' });
      }
      if (description.length < 10) {
        throw httpError(400, 'Describe la falla con al menos 10 caracteres.', { description: 'Agrega más detalles.' });
      }
      if (!SEVERITIES.has(severity)) {
        throw httpError(400, 'Selecciona una gravedad válida.', { severity: 'Gravedad inválida.' });
      }
      const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId);
      if (!equipment) throw httpError(404, 'El equipo seleccionado no existe.');
      if (req.user.role === 'manager' && equipment.branch_id !== req.user.branchId) {
        throw httpError(403, 'Solo puedes reportar fallas de tu sucursal.');
      }
      const incidentId = runTransaction(db, () => {
        const result = db.prepare(`
          INSERT INTO incidents
            (equipment_id, reported_by, description, severity, status, reported_at)
          VALUES (?, ?, ?, ?, 'open', ?)
        `).run(equipmentId, req.user.id, description, severity, nowIso());
        db.prepare("UPDATE equipment SET status = 'fault', updated_at = ? WHERE id = ?")
          .run(nowIso(), equipmentId);
        return Number(result.lastInsertRowid);
      });
      audit(db, req.user.id, 'create', 'incident', incidentId, severity);
      const incident = db.prepare(incidentQuery('WHERE i.id = ?')).get(incidentId);
      res.status(201).json({ incident: mapIncident(incident) });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/incidents/:id/resolve', requireAuth, requireRole('technician'), (req, res, next) => {
    try {
      const incidentId = Number(req.params.id);
      const notes = cleanText(req.body.notes, 800);
      const equipmentStatus = req.body.equipmentStatus || 'operational';
      if (notes.length < 5) {
        throw httpError(400, 'Explica brevemente cómo se resolvió la falla.', { notes: 'Agrega al menos 5 caracteres.' });
      }
      if (!EQUIPMENT_STATES.has(equipmentStatus)) {
        throw httpError(400, 'Selecciona un estado válido para el equipo.');
      }
      const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
      if (!incident) throw httpError(404, 'La incidencia no existe.');
      if (incident.status === 'resolved') throw httpError(409, 'La incidencia ya fue resuelta.');
      const resolvedAt = nowIso();
      if (resolvedAt < incident.reported_at) {
        throw httpError(400, 'La fecha de resolución no puede ser anterior al reporte.');
      }
      runTransaction(db, () => {
        db.prepare(`
          UPDATE incidents
          SET status = 'resolved', resolved_by = ?, resolved_at = ?, resolution_notes = ?
          WHERE id = ?
        `).run(req.user.id, resolvedAt, notes, incidentId);
        db.prepare('UPDATE equipment SET status = ?, updated_at = ? WHERE id = ?')
          .run(equipmentStatus, resolvedAt, incident.equipment_id);
      });
      audit(db, req.user.id, 'resolve', 'incident', incidentId, equipmentStatus);
      const updated = db.prepare(incidentQuery('WHERE i.id = ?')).get(incidentId);
      res.json({ incident: mapIncident(updated) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/users', requireAuth, requireRole('admin'), (_req, res) => {
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.branch_id, u.active,
        b.name AS branch_name, u.created_at, u.updated_at
      FROM users u LEFT JOIN branches b ON b.id = u.branch_id
      ORDER BY u.active DESC, u.name
    `).all();
    res.json({ users: rows.map(publicUser) });
  });

  app.post('/api/users', requireAuth, requireRole('admin'), (req, res, next) => {
    try {
      const name = cleanText(req.body.name, 100);
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');
      const role = req.body.role;
      const branchId = role === 'manager' ? Number(req.body.branchId) : null;
      const fields = {};
      if (name.length < 3) fields.name = 'Ingresa el nombre completo.';
      if (!/^\S+@\S+\.\S+$/.test(email)) fields.email = 'Ingresa un correo válido.';
      if (password.length < 10) fields.password = 'Usa al menos 10 caracteres.';
      if (!ROLES.has(role)) fields.role = 'Selecciona un rol válido.';
      if (role === 'manager' && !Number.isInteger(branchId)) fields.branchId = 'Asigna una sucursal.';
      if (Object.keys(fields).length) throw httpError(400, 'Revisa los datos del usuario.', fields);
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
        throw httpError(409, 'Ya existe una cuenta con ese correo.', { email: 'Correo ya registrado.' });
      }
      if (branchId && !db.prepare('SELECT 1 FROM branches WHERE id = ?').get(branchId)) {
        throw httpError(400, 'La sucursal seleccionada no existe.');
      }
      const passwordRecord = createPasswordRecord(password);
      const createdAt = nowIso();
      const result = db.prepare(`
        INSERT INTO users
          (name, email, password_hash, password_salt, role, branch_id, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(name, email, passwordRecord.hash, passwordRecord.salt, role, branchId, createdAt, createdAt);
      const userId = Number(result.lastInsertRowid);
      audit(db, req.user.id, 'create', 'user', userId, role);
      const user = db.prepare(`
        SELECT u.*, b.name AS branch_name FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id WHERE u.id = ?
      `).get(userId);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/users/:id', requireAuth, requireRole('admin'), (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!existing) throw httpError(404, 'El usuario no existe.');
      const name = cleanText(req.body.name ?? existing.name, 100);
      const role = req.body.role ?? existing.role;
      const branchId = role === 'manager' ? Number(req.body.branchId ?? existing.branch_id) : null;
      const active = req.body.active === undefined ? existing.active : Number(Boolean(req.body.active));
      if (name.length < 3 || !ROLES.has(role)) throw httpError(400, 'Revisa los datos del usuario.');
      if (role === 'manager' && !Number.isInteger(branchId)) throw httpError(400, 'Asigna una sucursal al encargado.');
      if (userId === req.user.id && !active) throw httpError(400, 'No puedes desactivar tu propia cuenta.');
      db.prepare(`
        UPDATE users SET name = ?, role = ?, branch_id = ?, active = ?, updated_at = ?
        WHERE id = ?
      `).run(name, role, branchId, active, nowIso(), userId);
      if (req.body.password) {
        if (String(req.body.password).length < 10) throw httpError(400, 'La contraseña debe tener al menos 10 caracteres.');
        const password = createPasswordRecord(String(req.body.password));
        db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
          .run(password.hash, password.salt, nowIso(), userId);
        db.prepare('DELETE FROM sessions WHERE user_id = ? AND user_id != ?').run(userId, req.user.id);
      }
      audit(db, req.user.id, 'update', 'user', userId, `${role}:${active}`);
      const user = db.prepare(`
        SELECT u.*, b.name AS branch_name FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id WHERE u.id = ?
      `).get(userId);
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole('admin'), (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      if (userId === req.user.id) throw httpError(400, 'No puedes desactivar tu propia cuenta.');
      const result = db.prepare('UPDATE users SET active = 0, updated_at = ? WHERE id = ?')
        .run(nowIso(), userId);
      if (!result.changes) throw httpError(404, 'El usuario no existe.');
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      audit(db, req.user.id, 'deactivate', 'user', userId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { maxAge: '1h', etag: true }));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && req.accepts('html')) {
        res.sendFile(path.join(staticDir, 'index.html'));
        return;
      }
      next();
    });
  }

  app.use('/api', (_req, _res, next) => next(httpError(404, 'Ruta no encontrada.')));
  app.use((error, _req, res, _next) => {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      error: status >= 500 ? 'Ocurrió un error inesperado.' : error.message,
      fields: error.fields,
    });
  });

  return app;
}

export function startServer(options = {}) {
  const app = createApp(options);
  const port = Number(options.port || process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001));
  return app.listen(port, '127.0.0.1', () => {
    console.log(`MarketOps API listening on http://127.0.0.1:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
