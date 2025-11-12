#!/usr/bin/env node

/**
 * Export OpenAPI (Swagger) specification for each backend service into docs/openapi.
 *
 * This script will:
 * 1. Iterate all backend services that expose Swagger config.
 * 2. Temporarily change working directory to the service folder so swagger-jsdoc glob works.
 * 3. Require the service's swagger config and write the generated spec to JSON.
 *
 * Usage:
 *   npm run export:openapi
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'docs', 'openapi');

const services = [
  { name: 'gatewayservice', dir: path.join(rootDir, 'backend', 'gatewayservice') },
  { name: 'routeservice', dir: path.join(rootDir, 'backend', 'routeservice') },
  { name: 'driverservice', dir: path.join(rootDir, 'backend', 'driverservice') },
  { name: 'userservice', dir: path.join(rootDir, 'backend', 'userservice') },
  { name: 'maintenanceservice', dir: path.join(rootDir, 'backend', 'maintenanceservice') },
  { name: 'ticketservice', dir: path.join(rootDir, 'backend', 'ticketservice') },
  { name: 'scheduleservice', dir: path.join(rootDir, 'backend', 'scheduleservice') },
  { name: 'busservice', dir: path.join(rootDir, 'backend', 'busservice') },
];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let hasError = false;

for (const service of services) {
  const prevCwd = process.cwd();
  try {
    process.chdir(service.dir);

    const swaggerConfigPath = path.join(service.dir, 'config', 'swagger.js');
    delete require.cache[require.resolve(swaggerConfigPath)];
    const swaggerSpec = require(swaggerConfigPath);

    const outputPath = path.join(outputDir, `${service.name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');

    console.log(`✅ Exported ${service.name} spec -> ${path.relative(rootDir, outputPath)}`);
  } catch (error) {
    hasError = true;
    console.error(`❌ Failed to export OpenAPI for ${service.name}: ${error.message}`);
  } finally {
    process.chdir(prevCwd);
  }
}

if (hasError) {
  console.error('\nSome OpenAPI specs failed to export.');
  process.exitCode = 1;
} else {
  console.log('\nAll OpenAPI specs exported successfully.');
}

