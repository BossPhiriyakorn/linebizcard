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
const frontendDir = path.join(rootDir, 'frontend');

// ลบครบเหมือน bamboo-DB — ลดโอกาส build ค้างจาก cache เสีย
const dirsToClean = [
  path.join(frontendDir, '.next'),
  path.join(frontendDir, 'node_modules', '.cache'),
  path.join(frontendDir, '.turbo'),
];

dirsToClean.forEach((dir) => {
  if (fs.existsSync(dir)) {
    const rel = path.relative(rootDir, dir);
    console.log('🧹 Removing', rel, '...');
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('   Done.');
  }
});

console.log('\n📦 Running npm run build...');
const env = { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=2048' };
const result = spawnSync('npm', ['run', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status !== null ? result.status : 0);
