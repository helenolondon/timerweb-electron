const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'Api Time C Web',
  description: 'This is my Node.js API running silently in the background.',
  script: 'E:\\lab\\timerweb\\backend\\server.js' // Use absolute path and double backslashes
});

// Listen for the "install" event, then start the service
svc.on('install', function() {
  console.log('Service installed successfully!');
  svc.start();
});

svc.install();