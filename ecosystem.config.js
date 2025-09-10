module.exports = {
  apps: [
    {
      name: 'redm-backend',
      script: './dev-backend.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'redm-frontend',
      script: './dev-frontend.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};