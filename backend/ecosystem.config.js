module.exports = {
  apps: [
    {
      name: 'tdarab-api',
      script: './src/app.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      merge_logs: true,
      time: true,
    },
  ],
}
