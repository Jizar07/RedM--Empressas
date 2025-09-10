const { spawn } = require('child_process');

const nodemon = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  windowsHide: true
});

nodemon.on('exit', (code) => {
  process.exit(code);
});