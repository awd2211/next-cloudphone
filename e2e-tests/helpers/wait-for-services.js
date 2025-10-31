#!/usr/bin/env node

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

const SERVICES = [
  {
    name: 'User Service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:30001',
    endpoint: '/health',
  },
  {
    name: 'Device Service',
    url: process.env.DEVICE_SERVICE_URL || 'http://localhost:30002',
    endpoint: '/health',
  },
  {
    name: 'Billing Service',
    url: process.env.BILLING_SERVICE_URL || 'http://localhost:30005',
    endpoint: '/health',
  },
];

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 2000;

async function checkService(service) {
  try {
    const response = await axios.get(`${service.url}${service.endpoint}`, {
      timeout: 3000,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function waitForService(service) {
  console.log(`Waiting for ${service.name} at ${service.url}...`);

  for (let i = 0; i < MAX_RETRIES; i++) {
    const isHealthy = await checkService(service);

    if (isHealthy) {
      console.log(`✓ ${service.name} is ready`);
      return true;
    }

    if (i < MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
    }
  }

  console.error(`✗ ${service.name} failed to start after ${MAX_RETRIES} attempts`);
  return false;
}

async function waitForAllServices() {
  console.log('Waiting for services to be ready...\n');

  const results = await Promise.all(SERVICES.map((service) => waitForService(service)));

  const allReady = results.every((result) => result === true);

  if (allReady) {
    console.log('\n✓ All services are ready!');
    process.exit(0);
  } else {
    console.error('\n✗ Some services failed to start');
    process.exit(1);
  }
}

// Only wait if E2E_WAIT_FOR_SERVICES is true
if (process.env.E2E_WAIT_FOR_SERVICES === 'true') {
  waitForAllServices();
} else {
  console.log('Skipping service health checks (E2E_WAIT_FOR_SERVICES is not enabled)');
  process.exit(0);
}
