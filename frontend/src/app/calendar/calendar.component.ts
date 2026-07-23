import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import brLocale from '@fullcalendar/core/locales/pt-br';
import * as XLSX from 'xlsx';

interface Appointment {
  id?: number;
  description: string;
  start_time: string;
  end_time: string;
  jira_number?: string;
}

// Electron API interface
interface ElectronAPI {
  getAppointments: () => Promise<Appointment[]>;
  getAppointmentsByRange: (startDate: string, endDate: string) => Promise<Appointment[]>;
  getAppointmentById: (id: number) => Promise<Appointment>;
  createAppointment: (appointment: Appointment) => Promise<Appointment>;
  updateAppointment: (id: number, appointment: Appointment) => Promise<{ message: string }>;
  deleteAppointment: (id: number) => Promise<{ message: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

@Component({
  selector: 'app-calendar',
  standalone: false,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, AfterViewInit {
  showNonBusinessHours: boolean = false;

  calendarOptions: CalendarOptions = {
    initialView: 'timeGridWeek',
    plugins: [timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'toggleHours,exportButton'
    },
    customButtons: {
      toggleHours: {
        text: 'Horário Exp.',
        click: () => this.toggleBusinessHours()
      },
      exportButton: {
        text: 'Exportar Excel',
        click: () => this.openExportModal()
      }
    },
    slotDuration: '00:15:00',
    slotLabelInterval: '01:00:00',
    slotMinTime: '08:00:00',
    slotMaxTime: '18:00:00',
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '18:00'
    },
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    dayHeaderFormat: {
      day: '2-digit',
      month: '2-digit'
    },
    titleFormat: {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    },
    views: {
      timeGridWeek: {
        titleFormat: {
          month: '2-digit',
          day: '2-digit'
        }
      }
    },
    allDaySlot: false,
    selectable: true,
    editable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: false,
    locale: brLocale,
    events: [],
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this)
  };

  showModal = false;
  isEditMode = false;
  showExportModal = false;
  selectedEvent: EventInput | null = null;
  currentTime: string = '';
  selectedRange: { start: Date; end: Date } | null = null;
  formData: Appointment = {
    description: '',
    start_time: '',
    end_time: '',
    jira_number: ''
  };
  exportData: {
    startDateTime: string;
    endDateTime: string;
  } = {
    startDateTime: '',
    endDateTime: ''
  };
  errorMessage = '';

  constructor() {
    // Check if running in Electron environment
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('Running in Electron environment');
      console.log('electronAPI available:', window.electronAPI);
    } else {
      console.log('Not running in Electron environment');
      console.log('window object:', typeof window !== 'undefined' ? window : 'undefined');
      console.log('electronAPI on window:', typeof window !== 'undefined' && window.electronAPI ? 'yes' : 'no');
    }
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  updateClock(): void {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    this.currentTime = `${hours}:${minutes}:${seconds}`;
  }

  ngAfterViewInit(): void {
    // Inject clock into FullCalendar toolbar after initialization
    setTimeout(() => {
      const toolbar = document.querySelector('.fc-toolbar');
      if (toolbar) {
        const clockElement = document.createElement('div');
        clockElement.className = 'digital-clock';
        clockElement.style.position = 'absolute';
        clockElement.style.top = '14px';
        clockElement.style.right = '20px';
        clockElement.style.paddingRight = '30px';
        clockElement.style.fontSize = '1.5rem';
        clockElement.style.fontWeight = 'bold';
        clockElement.style.color = 'white';
        clockElement.style.fontFamily = "'Courier New', monospace";
        clockElement.style.zIndex = '1000';
        clockElement.style.pointerEvents = 'none';
        clockElement.textContent = this.currentTime;
        toolbar.appendChild(clockElement);

        // Update clock every second
        setInterval(() => {
          clockElement.textContent = this.currentTime;
        }, 1000);
      }
    }, 100);
  }

  loadAppointments(): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Use Electron IPC
      window.electronAPI.getAppointments().then((appointments: Appointment[]) => {
        const events: EventInput[] = appointments.map(apt => ({
          id: apt.id?.toString(),
          title: `${apt.description}${apt.jira_number ? ` (${apt.jira_number})` : ''}`,
          start: apt.start_time,
          end: apt.end_time,
          extendedProps: {
            description: apt.description,
            jira_number: apt.jira_number
          }
        }));
        this.calendarOptions.events = events;
      }).catch((error: any) => {
        console.error('Erro ao carregar tarefas:', error);
      });
    } else {
      console.error('Electron API not available');
    }
  }

  toggleBusinessHours(): void {
    this.showNonBusinessHours = !this.showNonBusinessHours;
    if (this.showNonBusinessHours) {
      this.calendarOptions.slotMinTime = '00:00:00';
      this.calendarOptions.slotMaxTime = '24:00:00';
      this.calendarOptions.weekends = true;
      // Add active class to button
      setTimeout(() => {
        const button = document.querySelector('.fc-toggleHours-button');
        if (button) {
          button.classList.add('fc-toggleHours-button-active');
        }
      });
    } else {
      this.calendarOptions.slotMinTime = '08:00:00';
      this.calendarOptions.slotMaxTime = '18:00:00';
      this.calendarOptions.weekends = false;
      // Remove active class from button
      setTimeout(() => {
        const button = document.querySelector('.fc-toggleHours-button');
        if (button) {
          button.classList.remove('fc-toggleHours-button-active');
        }
      });
    }
  }

  handleDateSelect(selectInfo: any): void {
    // Store the selected range
    this.selectedRange = {
      start: selectInfo.start,
      end: selectInfo.end
    };
  }

  handleEventClick(clickInfo: any): void {
    this.selectedEvent = clickInfo.event;
    this.isEditMode = true;

    // Populate form with event data
    this.formData = {
      description: clickInfo.event.extendedProps.description || '',
      start_time: this.formatDateTime(new Date(clickInfo.event.start)),
      end_time: this.formatDateTime(new Date(clickInfo.event.end)),
      jira_number: clickInfo.event.extendedProps.jira_number || ''
    };

    this.showModal = true;
    this.errorMessage = '';
  }

  handleEventDrop(dropInfo: any): void {
    const event = dropInfo.event;
    const updatedData: Appointment = {
      description: event.extendedProps.description || '',
      start_time: this.formatDateTime(new Date(event.start)),
      end_time: this.formatDateTime(new Date(event.end)),
      jira_number: event.extendedProps.jira_number || ''
    };

    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.updateAppointment(parseInt(event.id), updatedData).then(() => {
        this.loadAppointments();
      }).catch((error: any) => {
        console.error('Erro ao atualizar tarefa:', error);
        dropInfo.revert();
      });
    } else {
      console.error('Electron API not available');
      dropInfo.revert();
    }
  }

  handleEventResize(resizeInfo: any): void {
    const event = resizeInfo.event;
    const updatedData: Appointment = {
      description: event.extendedProps.description || '',
      start_time: this.formatDateTime(new Date(event.start)),
      end_time: this.formatDateTime(new Date(event.end)),
      jira_number: event.extendedProps.jira_number || ''
    };

    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.updateAppointment(parseInt(event.id), updatedData).then(() => {
        this.loadAppointments();
      }).catch((error: any) => {
        console.error('Erro ao atualizar tarefa:', error);
        resizeInfo.revert();
      });
    } else {
      console.error('Electron API not available');
      resizeInfo.revert();
    }
  }

  onContextMenu(event: MouseEvent, info: any): void {
    event.preventDefault();
    
    let startDate: Date;
    let endDate: Date;
    
    // Use selected range if available, otherwise use clicked slot
    if (this.selectedRange) {
      startDate = new Date(this.selectedRange.start);
      endDate = new Date(this.selectedRange.end);
      // Clear the selection after using it
      this.selectedRange = null;
    } else {
      // Get the clicked slot's date/time
      const clickedDate = info.date;
      
      // Round to nearest 15 minutes
      startDate = new Date(clickedDate);
      const minutes = startDate.getMinutes();
      const roundedMinutes = Math.round(minutes / 15) * 15;
      startDate.setMinutes(roundedMinutes);
      startDate.setSeconds(0);
      startDate.setMilliseconds(0);
      
      // Set end time to 1 hour after start
      endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
    }
    
    this.formData = {
      description: '',
      start_time: this.formatDateTime(startDate),
      end_time: this.formatDateTime(endDate),
      jira_number: ''
    };
    
    this.showModal = true;
    this.errorMessage = '';
  }

  formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onSubmit(): void {
    if (!this.formData.description || !this.formData.start_time || !this.formData.end_time) {
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios';
      return;
    }

    if (new Date(this.formData.start_time) >= new Date(this.formData.end_time)) {
      this.errorMessage = 'O horário final deve ser após o horário inicial';
      return;
    }

    if (typeof window !== 'undefined' && window.electronAPI) {
      if (this.isEditMode && this.selectedEvent && this.selectedEvent.id) {
        // Update existing appointment
        window.electronAPI.updateAppointment(parseInt(this.selectedEvent.id), this.formData).then(() => {
          this.showModal = false;
          this.isEditMode = false;
          this.selectedEvent = null;
          this.loadAppointments();
        }).catch((error: any) => {
          console.error('Erro ao atualizar tarefa:', error);
          this.errorMessage = 'Erro ao atualizar tarefa';
        });
      } else {
        // Create new appointment
        window.electronAPI.createAppointment(this.formData).then(() => {
          this.showModal = false;
          this.loadAppointments();
        }).catch((error: any) => {
          console.error('Erro ao criar tarefa:', error);
          this.errorMessage = 'Erro ao criar tarefa';
        });
      }
    } else {
      console.error('Electron API not available');
      this.errorMessage = 'Electron API not available';
    }
  }

  onCancel(): void {
    this.showModal = false;
    this.isEditMode = false;
    this.selectedEvent = null;
    this.formData = {
      description: '',
      start_time: '',
      end_time: '',
      jira_number: ''
    };
    this.errorMessage = '';
  }

  onDelete(): void {
    if (this.selectedEvent && this.selectedEvent.id && typeof window !== 'undefined' && window.electronAPI) {
      const eventId = this.selectedEvent.id;
      window.electronAPI.deleteAppointment(parseInt(eventId)).then(() => {
        this.showModal = false;
        this.isEditMode = false;
        this.selectedEvent = null;
        this.loadAppointments();
      }).catch((error: any) => {
        console.error('Erro ao excluir tarefa:', error);
        this.errorMessage = 'Erro ao excluir tarefa';
      });
    } else {
      console.error('Electron API not available');
      this.errorMessage = 'Electron API not available';
    }
  }

  openExportModal(): void {
    this.showExportModal = true;
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    this.exportData = {
      startDateTime: this.formatDateTimeForDisplay(yesterday),
      endDateTime: this.formatDateTimeForDisplay(now)
    };
    this.errorMessage = '';
  }

  formatDateTimeForDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  parseDateTimeFromDisplay(dateTimeStr: string): Date {
    const parts = dateTimeStr.split(' ');
    if (parts.length !== 2) {
      return new Date();
    }
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    
    if (dateParts.length !== 3 || timeParts.length !== 2) {
      return new Date();
    }
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    return new Date(year, month, day, hours, minutes);
  }

  onDateTimeInput(event: any, field: 'start' | 'end'): void {
    let value = event.target.value;
    
    // Remove all non-digit characters
    value = value.replace(/\D/g, '');
    
    // Apply mask: DD/MM/AAAA HH:MM
    if (value.length > 0) {
      // Add slashes for date
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
      }
      if (value.length >= 5) {
        value = value.substring(0, 5) + '/' + value.substring(5);
      }
      if (value.length >= 10) {
        value = value.substring(0, 10) + ' ' + value.substring(10);
      }
      if (value.length >= 13) {
        value = value.substring(0, 13) + ':' + value.substring(13);
      }
    }
    
    // Limit to DD/MM/AAAA HH:MM format (16 characters)
    value = value.substring(0, 16);
    
    // Update the model
    if (field === 'start') {
      this.exportData.startDateTime = value;
    } else {
      this.exportData.endDateTime = value;
    }
  }

  closeExportModal(): void {
    this.showExportModal = false;
    this.exportData = {
      startDateTime: '',
      endDateTime: ''
    };
    this.errorMessage = '';
  }

  exportToExcel(): void {
    if (!this.exportData.startDateTime || !this.exportData.endDateTime) {
      this.errorMessage = 'Por favor, selecione as datas e horários de início e fim';
      return;
    }

    // Validate datetime format
    const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
    if (!dateTimeRegex.test(this.exportData.startDateTime) || !dateTimeRegex.test(this.exportData.endDateTime)) {
      this.errorMessage = 'Formato inválido. Use DD/MM/AAAA HH:MM';
      return;
    }

    const startDate = this.parseDateTimeFromDisplay(this.exportData.startDateTime);
    const endDate = this.parseDateTimeFromDisplay(this.exportData.endDateTime);
    endDate.setSeconds(59, 999);

    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.getAppointmentsByRange(startDate.toISOString(), endDate.toISOString()).then((appointments: Appointment[]) => {
        if (appointments.length === 0) {
          this.errorMessage = 'Nenhuma tarefa encontrada no período selecionado';
          return;
        }

        // Format data for Excel
        const excelData = appointments.map((apt: Appointment) => {
          const aptStartDate = new Date(apt.start_time);
          const aptEndDate = new Date(apt.end_time);
          const durationMs = aptEndDate.getTime() - aptStartDate.getTime();
          const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
          const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          const duration = `${String(durationHours).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}`;

          return {
            'Horário Início': this.formatDateTimeForExcel(aptStartDate),
            'Horário Fim': this.formatDateTimeForExcel(aptEndDate),
            'Duração': duration,
            'Número Jira': apt.jira_number || '',
            'Descrição': apt.description
          };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tarefas');

        // Calculate totals per Jira number
        const jiraTotals: { [key: string]: number } = {};
        appointments.forEach((apt: Appointment) => {
          const aptStartDate = new Date(apt.start_time);
          const aptEndDate = new Date(apt.end_time);
          const durationMs = aptEndDate.getTime() - aptStartDate.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));
          const jiraKey = apt.jira_number || 'Sem Jira';
          jiraTotals[jiraKey] = (jiraTotals[jiraKey] || 0) + durationMinutes;
        });

        // Format totals data
        const totalsData = Object.entries(jiraTotals).map(([jira, minutes]) => {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const duration = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
          return {
            'Número Jira': jira,
            'Total Horas': duration
          };
        });

        // Create totals worksheet
        const wsTotals = XLSX.utils.json_to_sheet(totalsData);
        XLSX.utils.book_append_sheet(wb, wsTotals, 'Totais');

        // Generate filename with date range
        const filename = `tarefas_${this.formatDateForFilename(startDate)}_a_${this.formatDateForFilename(endDate)}.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);

        this.closeExportModal();
      }).catch((error: any) => {
        console.error('Erro ao exportar tarefas:', error);
        this.errorMessage = 'Erro ao exportar tarefas';
      });
    } else {
      console.error('Electron API not available');
      this.errorMessage = 'Electron API not available';
    }
  }

  formatDateTimeForExcel(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  formatDateForFilename(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
}
