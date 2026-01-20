# Chat App

Real-time chat application built with WebSockets, React, and Node.js.

## Features

- Real-time messaging
- Chat rooms
- Auto-reconnection
- Rate limiting & input validation

## Setup

```bash
cd Chat-app/Server && npm install
cd Chat-app/Chat-frontend && npm install
```

## Run

```bash
# Terminal 1 - Server
cd Chat-app/Server && npm run dev

# Terminal 2 - Frontend
cd Chat-app/Chat-frontend && npm run dev
```

Open `http://localhost:5173`

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, TypeScript, ws
