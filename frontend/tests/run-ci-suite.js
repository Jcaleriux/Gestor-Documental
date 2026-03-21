import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const testsRootDir = fileURLToPath(new URL('.', import.meta.url));
const runnerFileName = path.basename(fileURLToPath(import.meta.url));

const collectTestFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const files = [];

  for (const entry of sortedEntries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectTestFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.test.js')) {
      continue;
    }

    if (entry.name === runnerFileName) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
};

const testFiles = await collectTestFiles(testsRootDir);

if (testFiles.length === 0) {
  throw new Error('No se encontraron archivos de prueba para la suite CI del frontend.');
}

for (const testFile of testFiles) {
  await import(pathToFileURL(testFile).href);
}
