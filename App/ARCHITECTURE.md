# Enterprise System Architecture & Engineering Blueprint

This document details the high-level architecture, design patterns, security threat models, and data flow models for the **ChatApp Real-Time Enterprise Mobile Ecosystem**.

---

## 🏛 1. High-Level C4 System Container Diagram

```mermaid
graph TD
    Client[Expo React Native Mobile App]
    LB[Nginx / AWS ALB - Rate Limiter & SSL Termination]
    API[Express REST API & AI Assistant Engine]
    WS[Socket.io Real-Time Connection Gateway]
    DB[(MySQL InnoDB - Indexed Persistent Data)]
    Cache[(In-Memory Socket & Session Presence Store)]

    Client -->|HTTPS REST API / JSON| LB
    Client -->|WSS WebSockets / Bi-directional| WS
    LB --> API
    API --> DB
    WS --> Cache
    API --> Cache
```

---

## ⚡ 2. WebSocket Real-Time Event State Machine

```mermaid
sequenceDiagram
    autonumber
    participant ClientA as User A (Mobile)
    participant Gateway as Socket.io Server
    participant DB as MySQL Database
    participant ClientB as User B (Mobile)

    ClientA->>Gateway: Connect (JWT Bearer Handshake)
    Gateway-->>ClientA: Connected & Authenticated
    Gateway->>ClientB: Broadcast 'user_presence' (User A Online)

    ClientA->>Gateway: Join Room ('chat_42')
    ClientA->>Gateway: Emit 'typing_start' ({ chatId: 42 })
    Gateway->>ClientB: Emit 'user_typing' (isTyping: true)

    ClientA->>API: POST /api/messages/42 ({ message: "Hello!" })
    API->>DB: INSERT INTO messages
    DB-->>API: Message ID #105 Created
    API->>Gateway: Broadcast 'new_message' via Socket
    Gateway->>ClientB: Deliver 'new_message' Payload
    Gateway->>ClientA: Deliver 'new_message' Payload (Optimistic Sync)

    ClientB->>Gateway: Emit 'mark_read' ({ chatId: 42 })
    Gateway->>ClientA: Emit 'messages_read' ({ chatId: 42, readBy: User B })
```

---

## 🔒 3. Security Threat Model & Defense In Depth

| Threat Vector | Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- |
| **Brute Force Login** | IP Rate-limiting (max 20 requests per 15 min) | [authRoutes.js](file:///d:/HDP%20REACT%20PROJECT/App/ChatAppBackend/routes/authRoutes.js) |
| **HTTP Header Tampering** | Security Headers (CSP, HSTS, Frameguard, X-XSS) | `helmet()` in [server.js](file:///d:/HDP%20REACT%20PROJECT/App/ChatAppBackend/server.js) |
| **Session Interception** | Server-side JWT Blacklist Revocation on Logout | [auth.js](file:///d:/HDP%20REACT%20PROJECT/App/ChatAppBackend/middleware/auth.js) |
| **SQL Injection** | Parameterized MySQL queries (`mysql2/promise`) | All Controllers |
| **Stored XSS** | HTML entity sanitization on string inputs | `sanitize()` in [messageController.js](file:///d:/HDP%20REACT%20PROJECT/App/ChatAppBackend/controllers/messageController.js) |
| **Database Bloat & DoS** | Static file upload service with file type/size limits | [upload.js](file:///d:/HDP%20REACT%20PROJECT/App/ChatAppBackend/middleware/upload.js) |

---

## 🗄 4. Database Schema & Indexing Blueprint

```mermaid
erDiagram
    USERS ||--o{ CHATS : "participates in"
    CHATS ||--o{ MESSAGES : "contains"
    USERS ||--o{ MESSAGES : "sends"

    USERS {
        int id PK
        string name
        string email UK
        string password
        string avatar
        boolean is_online
        timestamp last_seen
    }

    CHATS {
        int id PK
        int user_one_id FK
        int user_two_id FK
        timestamp created_at
    }

    MESSAGES {
        int id PK
        int chat_id FK
        int sender_id FK
        string message
        string image
        boolean is_read
        boolean is_deleted
        timestamp created_at
    }
```

### High-Performance Indexing Strategy:
1. `idx_messages_chat_id_created ON messages(chat_id, id DESC)`: Enables sub-millisecond cursor pagination (`LIMIT 30 OFFSET 0` or `WHERE id < beforeId`).
2. `uq_chat_users ON chats(user_one_id, user_two_id)`: Guarantees unique 1-to-1 conversation pairs.

---

## 🤖 5. AI Assistant & Observability Architecture

1. **AI Smart Quick Reply Engine**: Analyzes conversation intent and returns contextually appropriate smart reply suggestions.
2. **Interactive OpenAPI / Swagger Documentation**: Available at `/api-docs` for real-time API exploration.
3. **Observability Metrics**: Exposed at `/api/health` providing real-time memory usage, CPU load averages, DB latency, and active WebSocket connection gauges.
