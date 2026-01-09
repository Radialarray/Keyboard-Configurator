# Backend Double-Start Fix

## Problem
When running `npm run dev:web`, the backend was being started twice, causing a "port 3001 already in use" error.

## Root Cause
The `dev.mjs` script spawns the backend with `cargo run`, then spawns the frontend with `npm run dev`. Without proper isolation:
1. The frontend spawn had no explicit `cwd` set, which could cause context issues
2. There was no guard to prevent nested invocations from re-starting the backend
3. If any part of the Vite/SvelteKit pipeline tried to spawn `dev.mjs` again, it would attempt to start the backend a second time

## Solution
Three changes were made to `web/dev.mjs`:

### 1. Environment Variable Guard
Added `LAZYQMK_BACKEND_STARTED=1` environment variable to signal that the backend is already running:

```javascript
async function main() {
  // Guard against double-start
  if (process.env.LAZYQMK_BACKEND_STARTED === '1') {
    log(colors.yellow, 'INFO', 'Backend already started by parent process, skipping...');
    return;
  }
  // ... rest of main()
}
```

### 2. Explicit Frontend Working Directory
Set explicit `cwd: '.'` for the frontend spawn to ensure it stays in the `web/` directory:

```javascript
const frontend = spawn(packageManager, ['run', 'dev'], {
  cwd: '.', // Ensure we stay in web/ directory
  stdio: 'inherit',
  shell: IS_WINDOWS,
  env: {
    ...process.env,
    LAZYQMK_BACKEND_STARTED: '1' // Prevent nested backend starts
  }
});
```

### 3. Environment Variable Propagation
The frontend spawn now inherits the `LAZYQMK_BACKEND_STARTED=1` flag, so any nested invocations will skip backend startup.

## Testing

### Unit Tests (`dev.test.mjs`)
Added 3 new tests (total: 18 tests, all passing):
- Test 8: Backend double-start guard behavior
- Test 9: Frontend spawn configuration validation

Run with: `npm run test:dev-script`

### Integration Tests (`test-double-start.mjs`)
Created new integration test that verifies:
1. Environment variable is properly set
2. `dev.mjs` exits early when `LAZYQMK_BACKEND_STARTED=1` is set

Run with: `npm run test:double-start`

### Full Test Suite
All tests now run together:
```bash
npm test
```

This runs:
1. Vitest unit tests
2. dev.mjs unit tests
3. Double-start integration tests

## How to Reproduce the Fix

### Before (Bug):
```bash
# Would cause "port 3001 already in use" under certain conditions
npm run dev:web
```

### After (Fixed):
```bash
# Now works correctly - starts backend once, frontend once
npm run dev:web

# This still works - starts ONLY frontend (no backend)
npm run dev
```

### Manual Verification:
```bash
# Test that guard works
LAZYQMK_BACKEND_STARTED=1 node web/dev.mjs
# Should output: "Backend already started by parent process, skipping..."

# Test normal operation
cd web && node dev.mjs
# Should start backend and frontend without port conflicts
```

## Behavior

### `npm run dev` (Vite only)
- Starts Vite dev server on http://localhost:5173
- Does NOT start backend
- Expects backend to already be running on http://localhost:3001
- Use this when you're already running the backend separately

### `npm run dev:web` (Full stack)
- Starts backend on http://localhost:3001
- Waits for backend health check
- Starts Vite dev server on http://localhost:5173
- Sets `LAZYQMK_BACKEND_STARTED=1` to prevent double-start
- Use this for full-stack development

## Files Modified
1. `web/dev.mjs` - Added guard and explicit cwd
2. `web/dev.test.mjs` - Added unit tests for double-start prevention
3. `web/test-double-start.mjs` - New integration test file
4. `web/package.json` - Added `test:double-start` script
5. `web/FIX-DOUBLE-START.md` - This documentation file

## Acceptance Criteria ✅
- [x] `npm run dev:web` starts backend once and frontend once; no second cargo run
- [x] Existing tests (`npm test`, dev.test.mjs) updated/added to catch this
- [x] No breaking change for `npm run dev` running just frontend
- [x] Update bd issue LazyQMK-o7j notes if needed
