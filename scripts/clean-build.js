#!/usr/bin/env node
/**
 * Clean build: ลบ frontend/.next แล้วรัน build ใหม่
 * ช่วยป้องกัน build ค้างหรือผลลัพธ์เก่าค้าง (stale cache)
 * ใช้ตอน deploy หรือเมื่อ build ผิดปกติ
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const nextDir = path.join(rootDir, 'frontend', '.next');

if (fs.existsSync(nextDir)) {
  console.log('🧹 Removing frontend/.next (clean build)...');
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('   Done.');
} else {
  console.log('📁 frontend/.next not found, skipping clean.');
}

console.log('📦 Running npm run build...');
const env = { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=2048' };
const result = spawnSync('npm', ['run', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status !== null ? result.status : 0);
