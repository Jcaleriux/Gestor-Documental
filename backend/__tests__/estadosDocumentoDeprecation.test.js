const fs = require('fs');
const path = require('path');

const RUNTIME_DIRS = ['repositories', 'services', 'routes', 'mappers']
  .map((segment) => path.join(__dirname, '..', segment));

const walkFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }

    return fullPath;
  });
};

describe('estados_documento legacy retirement', () => {
  test('runtime backend no debe depender de estados_documento', () => {
    const matches = RUNTIME_DIRS
      .flatMap((dirPath) => walkFiles(dirPath))
      .filter((filePath) => filePath.endsWith('.js'))
      .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('estados_documento'))
      .map((filePath) => path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/'));

    expect(matches).toEqual([]);
  });

  test('bootstrap nuevo no debe recrear estados_documento', () => {
    const initSqlPath = path.join(__dirname, '..', 'db', 'database', '00_init.sql');
    const content = fs.readFileSync(initSqlPath, 'utf8');

    expect(content).not.toContain('CREATE TABLE IF NOT EXISTS public.estados_documento');
  });
});
