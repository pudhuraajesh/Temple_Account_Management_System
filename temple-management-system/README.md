# 🛕 Temple Account Management System

A web-based accounting and management system for temples to record and manage financial years, donations/income, and expenses with automated balance tracking and receipt generation.

## 🚀 Live Deployment to Render

To deploy this project to Render and make it a live website accessible to anyone, follow the full step-by-step instructions in [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Deployment Summary:
1. Push this repository to GitHub.
2. Create a free MySQL database at [TiDB Cloud](https://tidbcloud.com) or [Aiven](https://aiven.io).
3. Connect your repository to a new **Web Service** on [Render](https://render.com).
4. Add environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_SSL=true`).
5. Render will automatically build, auto-initialize database tables, and give you a live URL (`https://your-app.onrender.com`).

---

## 💻 Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/temple-management-system.git
   cd temple-management-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in your local MySQL credentials:
   ```bash
   cp .env.example .env
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Credentials

- **Username:** `Nainar`
- **Password:** `Nainar`

---

## 📂 Project Structure

```
temple-management-system/
├── app.js               # Main Express application server
├── package.json         # Project dependencies and npm scripts
├── render.yaml          # Render Blueprint deployment specification
├── DEPLOYMENT.md        # Step-by-step Render and GitHub deployment guide
├── .gitignore           # Git ignore rules for node_modules and secrets
├── .env.example         # Template for environment variables
├── database/
│   ├── db.js            # MySQL connection pool configuration
│   ├── init.js          # Auto-initializes tables on startup
│   └── schema.sql       # Database schema definition
├── public/
│   ├── css/             # Stylesheets
│   └── js/              # Client-side scripts
└── views/               # HTML Views
```
