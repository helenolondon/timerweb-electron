const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

let mainWindow;
let frontendServer;
let backendProcess;
let dbData = { appointments: [] };
let dbPath;
let backendPort = 3000;

// Initialize JSON database using native fs
dbPath = path.join(app.getPath('userData'), 'calendar.json');
console.log('Database path:', dbPath);

// Load data from JSON file
function loadDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      dbData = JSON.parse(data);
      console.log('Database loaded successfully');
    } else {
      dbData = { appointments: [] };
      saveDatabase();
      console.log('Database created');
    }
  } catch (err) {
    console.error('Error loading database:', err);
    dbData = { appointments: [] };
  }
}

// Save data to JSON file
function saveDatabase() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Load database on startup
loadDatabase();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  console.log('Preload path:', path.join(__dirname, 'preload.js'));
  console.log('Preload exists:', fs.existsSync(path.join(__dirname, 'preload.js')));

  // Start a simple HTTP server for the frontend
  startFrontendServer();

  // Load the Angular app from localhost
  mainWindow.loadURL('http://localhost:4201');

  // Show window when ready to prevent blank screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (frontendServer) {
      frontendServer.close();
    }
    if (backendProcess) {
      backendProcess.close();
    }
  });
}

function startFrontendServer() {
  const appExpress = express();
  const PORT = 4201;

  // Determine the frontend path
  let frontendPath;
  if (app.isPackaged) {
    frontendPath = path.join(process.resourcesPath, 'app.asar', 'frontend', 'dist', 'timerweb');
  } else {
    frontendPath = path.join(__dirname, 'frontend', 'dist', 'timerweb');
  }

  console.log('Serving frontend from:', frontendPath);
  console.log('Frontend path exists:', fs.existsSync(frontendPath));

  if (!fs.existsSync(frontendPath)) {
    console.error('Frontend path does not exist!');
    return;
  }

  // Serve static files
  appExpress.use(express.static(frontendPath));

  // Handle SPA routing
  appExpress.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  frontendServer = appExpress.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
  });

  frontendServer.on('error', (err) => {
    console.error('Frontend server error:', err);
  });
}

function startBackend() {
  const appExpress = express();
  const PORT = 4567;

  // Middleware
  appExpress.use(cors());
  appExpress.use(bodyParser.json());

  // Load database on startup
  loadDatabase();

  // API Routes

  // Get all appointments
  appExpress.get('/api/appointments', (req, res) => {
    try {
      loadDatabase();
      const appointments = dbData.appointments.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      res.json(appointments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get appointments by date range
  appExpress.get('/api/appointments/range', (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      loadDatabase();
      const appointments = dbData.appointments.filter(apt => {
        const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
        return aptDate >= start && aptDate <= end;
      }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      res.json(appointments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get appointment by ID
  appExpress.get('/api/appointments/:id', (req, res) => {
    try {
      loadDatabase();
      const appointment = dbData.appointments.find(apt => apt.id === parseInt(req.params.id));
      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }
      res.json(appointment);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create new appointment
  appExpress.post('/api/appointments', (req, res) => {
    try {
      const { description, start_time, end_time, jira_number } = req.body;

      if (!description || !start_time || !end_time) {
        res.status(400).json({ error: 'Description, start_time, and end_time are required' });
        return;
      }

      loadDatabase();
      const newId = dbData.appointments.length > 0 ? Math.max(...dbData.appointments.map(a => a.id)) + 1 : 1;
      const newAppointment = {
        id: newId,
        description,
        start_time,
        end_time,
        jira_number: jira_number || null,
        created_at: new Date().toISOString()
      };

      dbData.appointments.push(newAppointment);
      saveDatabase();

      res.status(201).json(newAppointment);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update appointment
  appExpress.put('/api/appointments/:id', (req, res) => {
    try {
      const { description, start_time, end_time, jira_number } = req.body;

      loadDatabase();
      const index = dbData.appointments.findIndex(apt => apt.id === parseInt(req.params.id));
      if (index === -1) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      dbData.appointments[index] = {
        ...dbData.appointments[index],
        description,
        start_time,
        end_time,
        jira_number: jira_number || null
      };

      saveDatabase();
      res.json({ message: 'Appointment updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete appointment
  appExpress.delete('/api/appointments/:id', (req, res) => {
    try {
      loadDatabase();
      const index = dbData.appointments.findIndex(apt => apt.id === parseInt(req.params.id));
      if (index === -1) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      dbData.appointments.splice(index, 1);
      saveDatabase();

      res.json({ message: 'Appointment deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Start server with port fallback
  function tryStartServer(port) {
    const server = appExpress.listen(port, () => {
      backendPort = port;
      console.log(`Backend server running on http://localhost:${port}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}...`);
        tryStartServer(port + 1);
      } else {
        console.error('Backend server error:', err);
      }
    });
    backendProcess = server;
  }

  tryStartServer(PORT);
}

// IPC Handlers for database operations
ipcMain.handle('get-appointments', async () => {
  loadDatabase();
  return dbData.appointments.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
});

ipcMain.handle('get-appointments-range', async (event, startDate, endDate) => {
  const start = new Date(startDate).toISOString().split('T')[0];
  const end = new Date(endDate).toISOString().split('T')[0];
  
  loadDatabase();
  return dbData.appointments.filter(apt => {
    const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
    return aptDate >= start && aptDate <= end;
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
});

ipcMain.handle('get-appointment-by-id', async (event, id) => {
  loadDatabase();
  return dbData.appointments.find(apt => apt.id === parseInt(id));
});

ipcMain.handle('create-appointment', async (event, appointment) => {
  loadDatabase();
  const newId = dbData.appointments.length > 0 ? Math.max(...dbData.appointments.map(a => a.id)) + 1 : 1;
  const newAppointment = {
    id: newId,
    ...appointment,
    created_at: new Date().toISOString()
  };
  
  dbData.appointments.push(newAppointment);
  saveDatabase();
  return newAppointment;
});

ipcMain.handle('update-appointment', async (event, id, appointment) => {
  loadDatabase();
  const index = dbData.appointments.findIndex(apt => apt.id === parseInt(id));
  if (index === -1) {
    throw new Error('Appointment not found');
  }
  
  dbData.appointments[index] = {
    ...dbData.appointments[index],
    ...appointment
  };
  
  saveDatabase();
  return { message: 'Appointment updated successfully' };
});

ipcMain.handle('delete-appointment', async (event, id) => {
  loadDatabase();
  const index = dbData.appointments.findIndex(apt => apt.id === parseInt(id));
  if (index === -1) {
    throw new Error('Appointment not found');
  }
  
  dbData.appointments.splice(index, 1);
  saveDatabase();
  return { message: 'Appointment deleted successfully' };
});

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Close server when all windows are closed
    if (backendProcess) {
      backendProcess.close();
    }
    if (frontendServer) {
      frontendServer.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close server before quitting
  if (backendProcess) {
    backendProcess.close();
  }
  if (frontendServer) {
    frontendServer.close();
  }
});
