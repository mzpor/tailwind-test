module.exports = {
  apps: [
    {
      name: 'website',
      script: 'npx',
      args: 'vite',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'robot',
      script: 'index.js',
      cwd: './robot',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      instances: 1
    },
    {
      name: 'gateway',
      script: 'gateway_bale.js',
      cwd: './robot',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      instances: 1
    }
  ]
};

