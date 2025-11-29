# CoLab - Real-time Collaborative Editor

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

**CoLab** is a production-grade real-time collaborative text editor built with modern distributed systems principles. It allows multiple users to edit documents simultaneously with conflict-free synchronization, similar to Google Docs.

## 🚀 Features

### Core Collaboration
- **Real-time Synchronization**: Powered by **Y.js** (CRDTs) and **WebSockets** for instant, conflict-free updates.
- **Live Presence**: See remote cursors, user names, and unique colors in real-time.
- **Multi-User Editing**: Supports concurrent editing with eventual consistency guarantees.

### Advanced Features
- **Version History**:
  - **Timeline View**: Browse past snapshots of the document.
  - **Diff Viewer**: Visual comparison (additions/deletions) between versions.
  - **Restore**: Rollback to any previous version instantly.
- **Import/Export**:
  - Import local files (`.txt`, `.js`, `.py`, `.md`, etc.).
  - Export documents as text files.
- **Sharing**: Generate unique, secure links for instant collaboration.

### Security & Reliability
- **Authentication**: Secure JWT-based auth with Refresh Tokens (7-day session rotation).
- **Secure WebSockets**: Token-based handshake authentication for real-time connections.
- **Persistence**: Auto-saving to PostgreSQL with Gzip-compressed snapshots.
- **Observability**: Real-time metrics dashboard (CPU, Memory, Active Connections).

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Editor**: CodeMirror 6
- **State/Sync**: Y.js, y-websocket
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Caching/PubSub**: Redis
- **Real-time**: ws (WebSocket)
- **Logging**: Winston

---

## 🏗 Architecture

The system uses a **Client-Server** architecture enhanced with **Peer-to-Peer** concepts via CRDTs:

1.  **CRDTs (Conflict-free Replicated Data Types)**: Y.js handles the mathematical complexity of merging concurrent edits without central locking.
2.  **WebSocket Server**: Acts as a central relay and persistence layer. It propagates binary update messages between clients.
3.  **Persistence**: Updates are debounced and saved to PostgreSQL. Snapshots are compressed with Gzip to optimize storage.
4.  **Scalability**: Redis Pub/Sub (ready for implementation) allows scaling WebSocket servers horizontally.

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (for Database & Redis)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/colab-editor.git
    cd colab-editor
    ```

2.  **Start Infrastructure (PostgreSQL + Redis)**
    ```bash
    docker compose up -d
    ```

3.  **Backend Setup**
    ```bash
    cd backend
    
    # Install dependencies
    npm install
    
    # Setup Environment Variables
    cp .env.example .env
    # (Update .env with your DB credentials if different from docker-compose)
    
    # Run Database Migrations
    npx prisma migrate dev
    
    # Start Server
    npm run dev
    ```

4.  **Frontend Setup**
    ```bash
    cd ../frontend
    
    # Install dependencies
    npm install
    
    # Start Development Server
    npm run dev
    ```

5.  **Access the App**
    Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

The project includes automated tests for conflict resolution and concurrency.

```bash
cd backend
npm run test
```

## 📈 Monitoring

Access the **Observability Dashboard** at `/dashboard` (requires login) to view:
- Active WebSocket connections
- System resource usage (CPU/RAM)
- Snapshot storage metrics

## 🚀 Deployment

### Option 1: Render Blueprint (Easiest & Free)
This repo includes a `render.yaml` file that automates everything.
1.  Fork this repo.
2.  Login to [Render](https://render.com/).
3.  Click **New +** -> **Blueprint**.
4.  Connect your forked repo.
5.  Render will auto-detect the configuration and deploy:
    -   **Backend Service** (Node.js)
    -   **Frontend Site** (React)
    -   **PostgreSQL Database**
    -   **Redis Instance**
6.  Click **Apply**. Done! 🎉

### Option 2: Manual Setup
If you prefer to set up services manually (e.g., using Neon/Upstash for permanent free tier), see the previous instructions or ask the AI assistant.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
