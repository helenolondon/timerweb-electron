# TimerWeb - Calendar Application

A full-stack calendar application built with Angular 19, FullCalendar, Node.js, Express, and SQLite. Available as a standalone Electron application.

## Features

- Weekly calendar view with 15-minute time slots
- Right-click on any time slot to create a new appointment
- Appointment fields: Description, Start Time, End Time, Jira Number
- Local SQLite database for data persistence
- RESTful API for CRUD operations
- **Standalone Electron application for desktop use**

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

### Option 1: Standalone Electron Application (Recommended)

1. Install dependencies in the root directory:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

3. Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

4. Build the frontend:
```bash
npm run build:frontend
```

5. Run the Electron application:
```bash
npm start
```

### Option 2: Development Mode (Backend + Frontend)

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:3000`

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the Angular development server:
```bash
npm start
```

The frontend will run on `http://localhost:4200`

## Building Standalone Application

To create a standalone executable for distribution:

### Windows:
```bash
npm run build:win
```

### Linux:
```bash
npm run build:linux
```

### macOS:
```bash
npm run build:mac
```

The built application will be in the `dist` directory.

## Usage

### Electron Application:
1. Run `npm start` to launch the application
2. The application will start automatically with the backend embedded
3. Right-click on any time slot in the weekly calendar view
4. Fill in the appointment details in the modal
5. Click "Create" to save the appointment
6. Click on an existing appointment to delete it

### Development Mode:
1. Make sure both backend and frontend servers are running
2. Open `http://localhost:4200` in your browser
3. Follow the same usage steps as above

## API Endpoints

- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get a specific appointment
- `POST /api/appointments` - Create a new appointment
- `PUT /api/appointments/:id` - Update an appointment
- `DELETE /api/appointments/:id` - Delete an appointment

## Database

The application uses SQLite for local data storage:
- **Electron mode**: Database is stored in the application's userData directory
- **Development mode**: Database file (`calendar.db`) is created in the backend directory

## Tech Stack

- **Frontend**: Angular 19, FullCalendar, TypeScript
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Desktop**: Electron 
"# timerweb-electron" 
"# timerweb-electron" 
"# timerweb-electron" 
