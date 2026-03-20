const { Pool } = require('pg');
const { resolveDbConfig } = require('../config/env');

const pool = new Pool({
  ...resolveDbConfig(),
  allowExitOnIdle: process.env.NODE_ENV === 'test',
});

module.exports = pool;
