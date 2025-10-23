# CI/CD Setup Documentation

## Overview

This document describes the Continuous Integration and Continuous Deployment setup for the Cloud Phone Platform.

## GitHub Actions Workflows

### Test Workflow (`.github/workflows/test.yml`)

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs**:

#### 1. Test Job

Runs all unit tests with coverage reporting.

**Services**:
- PostgreSQL 14 (port 5432)
- Redis 7 (port 6379)
- RabbitMQ 3 (ports 5672, 15672)

**Steps**:
1. Checkout code
2. Setup pnpm (v8) and Node.js (v20)
3. Install dependencies (`pnpm install --frozen-lockfile`)
4. Create test databases
5. Run tests for each service:
   - shared module (QuotaClient, EventBus)
   - user-service (AuthService)
   - device-service (DevicesService)
   - billing-service (PurchasePlanSaga)
6. Upload coverage to Codecov
7. Generate coverage summary

**Environment Variables**:
```yaml
NODE_ENV: test
DB_HOST: localhost
DB_PORT: 5432
DB_USERNAME: postgres
DB_PASSWORD: postgres
REDIS_HOST: localhost
REDIS_PORT: 6379
JWT_SECRET: test-jwt-secret-for-ci
RABBITMQ_URL: amqp://admin:admin123@localhost:5672
```

#### 2. Lint Job

Runs ESLint on all services.

**Steps**:
1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Run `pnpm lint` (non-blocking)

#### 3. Build Job

Builds all backend services (runs after test and lint).

**Steps**:
1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Run `pnpm build` for all services
5. Generate build summary

### Workflow Status

Check workflow status at: https://github.com/YOUR_ORG/next-cloudphone/actions

## Pre-commit Hooks

### Setup

The project uses Husky for Git hooks.

**Install Husky**:
```bash
cd /home/eric/next-cloudphone
pnpm add -D husky
pnpm exec husky init
```

### Pre-commit Hook (`.husky/pre-commit`)

Automatically runs tests for changed services before allowing commits.

**Behavior**:
- Detects which services have changed files
- Runs tests only for affected services
- Aborts commit if any tests fail

**Example Output**:
```
🧪 Running tests for changed services...
👤 Testing user-service...
 PASS  src/auth/__tests__/auth.service.spec.ts
✅ All tests passed!
```

### Bypass Pre-commit (Not Recommended)

If you need to bypass for emergency commits:
```bash
git commit --no-verify -m "Emergency fix"
```

## Code Coverage Reporting

### Codecov Integration

**Setup**:
1. Sign up at https://codecov.io
2. Add repository to Codecov
3. Get upload token
4. Add `CODECOV_TOKEN` to GitHub Secrets

**Coverage Files**:
- `backend/shared/coverage/coverage-final.json`
- `backend/user-service/coverage/coverage-final.json`
- `backend/device-service/coverage/coverage-final.json`
- `backend/billing-service/coverage/coverage-final.json`

**View Coverage**:
- Codecov Dashboard: https://codecov.io/gh/YOUR_ORG/next-cloudphone
- Pull Request Comments: Coverage diff shown automatically

### Local Coverage Reports

Generate coverage locally:

```bash
# For specific service
cd backend/user-service
pnpm test:cov

# View HTML report
open coverage/lcov-report/index.html
```

**Coverage Thresholds**:
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

## Running Tests Locally

### All Tests

```bash
# From project root
pnpm test

# With coverage
pnpm test:cov
```

### Individual Services

```bash
# Shared module
cd backend/shared
pnpm test

# User service
cd backend/user-service
pnpm test auth.service.spec

# Device service
cd backend/device-service
pnpm test devices.service.spec

# Billing service
cd backend/billing-service
pnpm test purchase-plan.saga.spec
```

### Watch Mode

```bash
cd backend/user-service
pnpm test:watch
```

### E2E Tests

```bash
cd backend/device-service
pnpm test:e2e
```

## CI/CD Best Practices

### 1. Fast Feedback

- Tests run in parallel where possible
- Only affected services tested in pre-commit hook
- Quick lint checks before full test suite

### 2. Isolated Test Environment

- Each job uses fresh Docker services
- Test databases created per run
- No shared state between test runs

### 3. Coverage Tracking

- Coverage uploaded to Codecov after each run
- Pull requests show coverage diff
- Failing coverage thresholds fail the build

### 4. Build Verification

- All services must build successfully
- Build runs after tests pass
- Catches compilation errors early

## Troubleshooting CI/CD

### Tests Pass Locally But Fail in CI

**Possible Causes**:
1. Environment variable differences
2. Database schema not migrated
3. Service dependencies not available

**Solutions**:
```bash
# Run tests with CI environment
NODE_ENV=test pnpm test --ci

# Check database migrations
docker compose exec postgres psql -U postgres -l

# Verify service health
curl http://localhost:5432 # postgres
curl http://localhost:6379 # redis
```

### Pre-commit Hook Not Running

**Check Hook Installation**:
```bash
ls -la .husky/pre-commit
# Should be executable (-rwxr-xr-x)
```

**Reinstall Hooks**:
```bash
pnpm exec husky init
chmod +x .husky/pre-commit
```

### Coverage Upload Fails

**Check Codecov Token**:
```bash
# In GitHub Settings > Secrets and variables > Actions
# Ensure CODECOV_TOKEN is set
```

**Manual Upload**:
```bash
# Install codecov CLI
npm install -g codecov

# Upload coverage
codecov -f coverage/coverage-final.json -t YOUR_TOKEN
```

### Build Fails on Dependencies

**Clear pnpm Cache**:
```bash
pnpm store prune
rm -rf node_modules
pnpm install
```

**Check pnpm Version**:
```bash
pnpm --version
# Should be 8.x
```

## GitHub Actions Configuration

### Required Secrets

Add these in GitHub Settings > Secrets and variables > Actions:

| Secret | Description | Required |
|--------|-------------|----------|
| `CODECOV_TOKEN` | Codecov upload token | Yes |
| `DOCKER_USERNAME` | Docker Hub username | For deployment |
| `DOCKER_PASSWORD` | Docker Hub password | For deployment |

### Branch Protection Rules

Recommended settings for `main` branch:

1. **Require pull request reviews before merging**
   - Required approving reviews: 1

2. **Require status checks to pass before merging**
   - Required checks:
     - Test Backend Services
     - Lint Code
     - Build Services

3. **Require branches to be up to date before merging**
   - ✓ Enabled

4. **Do not allow bypassing the above settings**
   - ✓ Include administrators

## Deployment Workflows (Future)

### Planned Workflows

#### 1. Deploy to Staging

**Trigger**: Push to `develop` branch

**Steps**:
1. Run tests
2. Build Docker images
3. Push to Docker registry
4. Deploy to staging environment
5. Run smoke tests

#### 2. Deploy to Production

**Trigger**: Release tag (e.g., `v1.0.0`)

**Steps**:
1. Run full test suite
2. Build production Docker images
3. Security scanning
4. Push to Docker registry
5. Deploy to production with rolling update
6. Health checks
7. Rollback on failure

#### 3. Database Migrations

**Trigger**: Manual workflow dispatch

**Steps**:
1. Backup current database
2. Run Atlas migrations
3. Verify migration success
4. Rollback on failure

## Monitoring and Alerts

### Workflow Notifications

**Slack Integration** (Future):
```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    channel-id: 'CHANNEL_ID'
    slack-message: "Test workflow failed on ${{ github.ref }}"
```

### Test Failure Analysis

When tests fail in CI:

1. Check GitHub Actions logs for error details
2. Look for environment-specific issues
3. Reproduce locally with `--ci` flag
4. Check service dependencies (DB, Redis, RabbitMQ)

## Performance Optimization

### Current Test Execution Time

- **shared**: ~3s
- **user-service**: ~5s
- **device-service**: ~4s
- **billing-service**: ~6s
- **Total**: ~18s

### Optimization Strategies

1. **Parallel Test Execution**: Already enabled with `maxWorkers`
2. **Test Splitting**: Split tests across multiple CI jobs
3. **Caching**: pnpm cache already configured
4. **Selective Testing**: Pre-commit hook only tests changed services

## Cost Optimization

### GitHub Actions Minutes

- **Free tier**: 2,000 minutes/month
- **Current usage**: ~5 minutes per run
- **Estimated runs**: ~400 runs/month (within free tier)

### Recommendations

1. Cache node_modules aggressively
2. Use matrix builds for parallel testing
3. Skip CI for documentation-only changes

**Skip CI**:
```bash
git commit -m "docs: update README [skip ci]"
```

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm in CI](https://pnpm.io/continuous-integration)
- [Jest CLI Options](https://jestjs.io/docs/cli)
- [Codecov Documentation](https://docs.codecov.com)
- [Husky Documentation](https://typicode.github.io/husky/)

## Summary

✅ **Implemented**:
- GitHub Actions workflow for automated testing
- Pre-commit hooks for local testing
- Code coverage reporting setup
- Lint checks
- Build verification

📋 **Next Steps**:
- Set up deployment workflows
- Configure Slack notifications
- Implement database migration workflows
- Add performance monitoring
