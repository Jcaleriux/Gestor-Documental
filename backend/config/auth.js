const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  BCRYPT_ROUNDS
};