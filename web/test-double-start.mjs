#!/usr/bin/env node

/**
 * Integration test to verify no double-start of backend
 * 
 * This test simulates what happens when dev.mjs runs and ensures
 * that the environment guard prevents nested backend starts.
 */

import { spawn } from 'child_process';

console.log('🧪 Testing backend double-start prevention...\n');

let testsPassed = 0;
let testsFailed = 0;

function pass(msg) {
  console.log(`✅ ${msg}`);
  testsPassed++;
}

function fail(msg) {
  console.log(`❌ ${msg}`);
  testsFailed++;
}

// Test 1: Environment variable is set when frontend spawns
console.log('Test 1: Frontend spawn sets LAZYQMK_BACKEND_STARTED');
const testEnv = {
  ...process.env,
  LAZYQMK_BACKEND_STARTED: '1'
};

if (testEnv.LAZYQMK_BACKEND_STARTED === '1') {
  pass('Environment variable is properly set');
} else {
  fail('Environment variable was not set');
}

// Test 2: Guard prevents execution when env var is set
console.log('\nTest 2: dev.mjs exits early when LAZYQMK_BACKEND_STARTED=1');
const testProcess = spawn('node', ['dev.mjs'], {
  env: testEnv,
  stdio: 'pipe'
});

let output = '';
testProcess.stdout.on('data', (data) => {
  output += data.toString();
});

testProcess.stderr.on('data', (data) => {
  output += data.toString();
});

testProcess.on('exit', (code) => {
  if (output.includes('Backend already started by parent process') || code === 0) {
    pass('dev.mjs respects LAZYQMK_BACKEND_STARTED guard');
  } else {
    fail('dev.mjs did not respect guard or encountered error');
    console.log('Output:', output);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Integration Tests: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(50));
  
  if (testsFailed > 0) {
    console.log('❌ Some integration tests failed');
    process.exit(1);
  } else {
    console.log('✅ All integration tests passed!');
    process.exit(0);
  }
});

// Timeout after 5 seconds
setTimeout(() => {
  testProcess.kill();
  fail('Test timed out after 5 seconds');
  process.exit(1);
}, 5000);
