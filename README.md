# ✂️ SNIP — Enterprise URL Shortener

Snip is a production-grade, event-driven URL shortener built with **NestJS**, **Next.js**, **Kafka**, and **Redis**. It goes beyond basic shortening by providing real-time analytics, developer API keys, safe browsing security, and extreme concurrency handling.

## 🚀 Key Features

- **🛡️ Security First**: Integrated with **Google Safe Browsing** to block malicious and phishing URLs at the source.
- **🔑 Developer API**: Programmatic access via permanent **API Keys** with a dedicated dashboard for developers.
- **🪝 Real-time Webhooks**: Get instant `POST` notifications to your own server whenever your links are clicked.
- **⚡ Event-Driven Analytics**: High-performance click tracking using **Kafka** for zero-latency redirects and a **Dead Letter Queue (DLQ)** for data durability.
- **🔒 Reliability**: Atomic **Redis Distributed Locks** and **Idempotency Keys** prevent race conditions and duplicate submissions.
- **📊 Observability**: Full monitoring stack with **Prometheus** metrics and **Grafana** dashboards pre-configured.

## 🏗️ Architecture

```mermaid
graph TD
    Client[Browser / API Client] --> Nginx[Nginx Reverse Proxy]
    Nginx --> Frontend[Next.js Frontend]
    Nginx --> Backend[NestJS Backend]
    
    Backend --> Redis[(Redis Cache / Lock)]
    Backend --> DB[(PostgreSQL)]
    Backend --> Kafka{Kafka Cluster}
    
    Kafka --> Consumer[Kafka Consumer]
    Consumer --> Redis
    Consumer --> Webhook[External Webhooks]
    Consumer --> DLQ[Dead Letter Queue]
    
    Prometheus[Prometheus] --> Backend
    Grafana[Grafana Dashboard] --> Prometheus
```

## 🛠️ Tech Stack

- **Backend**: NestJS, Prisma ORM, KafkaJS, ioredis, Passport (JWT + API Keys).
- **Frontend**: Next.js 16 (App Router), Tailwind CSS 4, React 19.
- **Infrastructure**: Docker, Nginx, PostgreSQL, Redis, Kafka (KRaft mode).
- **Cloud/Deployment**: Microsoft Azure VM, GitHub Actions (CI/CD).
- **Observability**: Prometheus, Grafana.

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Google Safe Browsing API Key (optional but recommended)

### Quick Start (Development)
1. Clone the repository.
2. Create a `.env` file in the root based on the requirements below.
3. Run the complete stack:
   ```bash
   docker compose up -d
   ```
4. Access the services:
   - **Frontend**: [http://localhost](http://localhost)
   - **API Docs (Swagger)**: [http://localhost/api/docs](http://localhost/api/docs)
   - **Metrics**: [http://localhost/api/metrics](http://localhost/api/metrics)
   - **Grafana**: [http://localhost:3002](http://localhost:3002) (Login: `admin`/`admin`)

## 🚀 Deployment (Azure)

This project is configured for automated deployment to a **Microsoft Azure VM** via GitHub Actions.

### 1. Infrastructure Preparation
- Provision an **Azure VM** (Linux/Ubuntu recommended).
- Install **Docker** and **Docker Compose v2** on the VM.
- Open ports `80` (HTTP) and `443` (HTTPS) in the Azure Network Security Group.
- Point your domain/subdomain (or DuckDNS) to the VM's Public IP.

### 2. GitHub Configuration
Add the following **Encrypted Secrets** to your GitHub repository:
- `AZURE_VM_HOST`: The Public IP or Domain of your Azure VM.
- `AZURE_VM_USER`: The SSH username (e.g., `azureuser` or `raj`).
- `AZURE_VM_SSH_KEY`: Your private SSH key (must have access to the VM).

### 3. Automated Flow
Every push to the `main` branch triggers the following:
1. **Lint & Test**: Ensures code quality and passes unit tests.
2. **Deploy**:
   - Connects to the Azure VM via SSH.
   - Pulls the latest code.
   - Rebuilds and restarts the production containers (`docker-compose.prod.yml`).
   - Prunes old images to save disk space.

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://admin:password@postgres:5432/db` |
| `REDIS_URL` | Redis Connection String | `redis://redis:6379` |
| `KAFKA_BROKERS` | Kafka Broker addresses | `kafka:9092` |
| `JWT_SECRET` | Secret key for issuing session tokens | `required` |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Key for malware detection | Required for security features |
| `GRAFANA_PASSWORD` | Admin password for Grafana | `admin` |

## 📖 API Documentation

The full REST API documentation is available via Swagger. Highlights include:
- `POST /url`: Create a short URL (Supports `Idempotency-Key` and `x-api-key`).
- `GET /:code`: Redirect to original destination (High-speed Redis cache hit).
- `GET /url/:code/stats`: Real-time aggregated click analytics.

## 📝 License
This project is for demonstration purposes in an agentic coding environment.
