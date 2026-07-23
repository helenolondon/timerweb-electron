const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppointments: () => {
    console.log('getAppointments called via IPC');
    return ipcRenderer.invoke('get-appointments');
  },
  getAppointmentsByRange: (startDate, endDate) => {
    console.log('getAppointmentsByRange called via IPC');
    return ipcRenderer.invoke('get-appointments-range', startDate, endDate);
  },
  getAppointmentById: (id) => {
    console.log('getAppointmentById called via IPC');
    return ipcRenderer.invoke('get-appointment-by-id', id);
  },
  createAppointment: (appointment) => {
    console.log('createAppointment called via IPC');
    return ipcRenderer.invoke('create-appointment', appointment);
  },
  updateAppointment: (id, appointment) => {
    console.log('updateAppointment called via IPC');
    return ipcRenderer.invoke('update-appointment', id, appointment);
  },
  deleteAppointment: (id) => {
    console.log('deleteAppointment called via IPC');
    return ipcRenderer.invoke('delete-appointment', id);
  }
});

console.log('electronAPI exposed to window');
