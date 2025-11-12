#!/usr/bin/env node

const os = require('os');
const platform = os.platform();

console.log('\n' + '='.repeat(60));
console.log('🚀 TransTrack - Platform Detection');
console.log('='.repeat(60));

if (platform === 'darwin') {
  console.log('✅ Detected: macOS / iOS Development Environment');
  console.log('📱 Running on Apple Silicon or Intel Mac');
  console.log('💡 Optimized for macOS/iOS development');
  console.log('');
} else if (platform === 'win32') {
  console.log('✅ Detected: Windows Environment');
  console.log('💡 Running on Windows');
  console.log('');
} else if (platform === 'linux') {
  console.log('✅ Detected: Linux Environment');
  console.log('💡 Running on Linux');
  console.log('');
} else {
  console.log(`✅ Detected: ${platform}`);
  console.log('');
}

console.log('='.repeat(60) + '\n');

