require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow configured frontend origin
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rate limit login — 20 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/masters',    require('./routes/masters'));
app.use('/api/households', require('./routes/households'));
app.use('/api/projects',   require('./routes/projects'));
app.use('/api/links',      require('./routes/links'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/audit',      require('./routes/audit'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/workflow',   require('./routes/workflow'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/privacy',    require('./routes/privacy'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Cache management — admin only
const cache   = require('./utils/cache');
const authMw  = require('./middleware/auth');
const { roles: adminOnly } = authMw;

app.get('/api/_cache/stats', authMw, adminOnly('admin'), (req, res) => {
  res.json(cache.stats());
});

app.delete('/api/_cache', authMw, adminOnly('admin'), (req, res) => {
  const { prefix } = req.query;
  if (prefix) cache.invalidatePrefix(prefix);
  else cache.invalidatePrefix('');
  res.json({ cleared: true, ts: new Date() });
});

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler — never expose internal details to client
app.use((err, req, res, next) => {
  console.error('[Unhandled]', err.message, err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Idempotent migrations
const _pool = require('./db/pool');

// Existing columns
_pool.query(`ALTER TABLE household_master ADD COLUMN is_dummy TINYINT(1) NOT NULL DEFAULT 0`)
  .catch(err => { if (!err.message.includes('Duplicate column name')) console.error('Migration warning:', err.message); });

// DPDPA: consent tracking columns on household_master
const dpdpaCols = [
  `ALTER TABLE household_master ADD COLUMN consent_given       TINYINT(1)   NOT NULL DEFAULT 0`,
  `ALTER TABLE household_master ADD COLUMN consent_at          DATETIME     NULL`,
  `ALTER TABLE household_master ADD COLUMN consent_language    VARCHAR(50)  NULL`,
  `ALTER TABLE household_master ADD COLUMN consent_version     VARCHAR(20)  NULL DEFAULT 'v1.0'`,
  `ALTER TABLE household_master ADD COLUMN is_anonymized       TINYINT(1)   NOT NULL DEFAULT 0`,
  `ALTER TABLE household_master ADD COLUMN anonymized_at       DATETIME     NULL`,
  `ALTER TABLE household_master ADD COLUMN anonymized_by       INT          NULL`,
  `ALTER TABLE household_master ADD COLUMN anonymization_reason VARCHAR(500) NULL`,
];
dpdpaCols.forEach(sql =>
  _pool.query(sql).catch(err => {
    if (!err.message.includes('Duplicate column name')) console.error('Migration warning:', err.message);
  })
);

// DPDPA: consent log table
_pool.query(`
  CREATE TABLE IF NOT EXISTS consent_log (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    household_id     VARCHAR(30) NOT NULL,
    enumerator_id    INT         NOT NULL,
    enumerator_name  VARCHAR(200),
    consent_given    TINYINT(1)  NOT NULL DEFAULT 1,
    consent_language VARCHAR(50),
    consent_version  VARCHAR(20) DEFAULT 'v1.0',
    consent_method   VARCHAR(50) DEFAULT 'verbal',
    recorded_at      DATETIME    DEFAULT NOW(),
    INDEX idx_cl_hh (household_id),
    INDEX idx_cl_enum (enumerator_id)
  )
`).catch(err => console.error('Migration warning (consent_log):', err.message));

// DPDPA: data subject request log
_pool.query(`
  CREATE TABLE IF NOT EXISTS data_subject_requests (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    household_id   VARCHAR(30) NOT NULL,
    request_type   ENUM('erasure','access','correction','portability') NOT NULL,
    requested_by   INT         NOT NULL,
    requester_name VARCHAR(200),
    reason         TEXT,
    status         ENUM('pending','completed','rejected') DEFAULT 'pending',
    resolved_by    INT         NULL,
    resolved_at    DATETIME    NULL,
    resolution_note TEXT       NULL,
    created_at     DATETIME    DEFAULT NOW(),
    INDEX idx_dsr_hh (household_id),
    INDEX idx_dsr_status (status)
  )
`).catch(err => console.error('Migration warning (data_subject_requests):', err.message));

_pool.query(`
  CREATE TABLE IF NOT EXISTS project_village_link (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    project_id        VARCHAR(20) NOT NULL,
    village_id        VARCHAR(10) NOT NULL,
    linked_at         DATETIME DEFAULT NOW(),
    linked_by_user_id INT,
    UNIQUE KEY uq_pvl (project_id, village_id),
    FOREIGN KEY (project_id) REFERENCES project_master(project_id) ON DELETE CASCADE,
    FOREIGN KEY (village_id) REFERENCES village_master(village_id) ON DELETE CASCADE,
    FOREIGN KEY (linked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`).catch(err => console.error('Migration warning (project_village_link):', err.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 MIS-HITS API running on port ${PORT}`));