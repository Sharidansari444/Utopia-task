# Task-Sharid

Task-Sharid is a full-stack application for device management and telemetry, featuring user authentication, real-time updates, and a modern React frontend.

## Project Structure

- `server.js` — Main Express server entry point.
- `middleware/` — Custom Express middleware (e.g., authentication).
- `models/` — Mongoose models for User, Device, and Telemetry.
- `routes/` — API routes for authentication and device management.
- `workers/` — Background workers (e.g., MQTT integration).
- `scripts/seedDatabase.js` — Script to seed the database with initial data.

### Client (Frontend)

- `client/` — React app
  - `public/` — Static assets and HTML template.
  - `src/`
    - `components/` — Reusable UI components (Layout, LoadingSpinner).
    - `contexts/` — React Contexts for Auth and Socket.
    - `pages/` — Main pages (Dashboard, Devices, Login, Register).
    - `services/api.js` — API service for HTTP requests.

## Features

- User registration and login
- Device dashboard and management
- Real-time telemetry updates (via MQTT)
- Protected routes with authentication middleware
- Database seeding for development

## Getting Started

1. Install dependencies:
   ```
   npm install
   cd client
   npm install
   ```
2. Start the backend server:
   ```
   node server.js
   ```
3. Start the frontend:
   ```
   cd client
   npm start
   ```
4. (Optional) Seed the database:
   ```
   node scripts/seedDatabase.js
   ```

## Technologies Used

- Node.js, Express
- MongoDB, Mongoose
- React
- MQTT (for real-time telemetry)
- JWT (for authentication)

## License

MIT
