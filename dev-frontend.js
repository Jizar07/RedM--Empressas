const { spawn } = require('child_process');
const path = require('path');

process.chdir(path.join(__dirname, 'frontend'));

const nextDev = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  windowsHide: true
});

nextDev.on('exit', (code) => {
  process.exit(code);
});