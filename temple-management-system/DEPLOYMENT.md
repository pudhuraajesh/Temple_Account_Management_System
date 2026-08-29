# 🚀 Live Deployment Guide - Temple Management System

This guide walks you through deploying your Temple Management System to **Render** and **GitHub** with a **Free Cloud MySQL Database**, making it live and accessible via a public URL for anyone to use.

---

## 📋 Overview of the Deployment Process

1. **Step 1:** Get a Free Cloud MySQL Database (e.g. TiDB Serverless or Aiven - 1 min)
2. **Step 2:** Push your project code to GitHub
3. **Step 3:** Deploy to Render as a Web Service
4. **Step 4:** Set Environment Variables on Render
5. **Step 5:** Access your Live Website URL!

---

## Step 1: Get a Free Cloud MySQL Database

Render hosts the Node.js application, and it needs a cloud MySQL database to store temple records. You can use **TiDB Cloud** (Free forever, 5 GB storage, instant setup) or **Aiven**.

### Recommended: TiDB Cloud Serverless (Free Forever)

1. Go to [https://tidbcloud.com](https://tidbcloud.com) and sign up for a free account (sign in with Google / GitHub).
2. Click **Create Cluster** and select **Serverless (Free)**.
3. Once created (takes ~15 seconds), click **Connect**.
4. Choose **Node.js / MySQL** or note down the connection details:
   - **Host** (e.g. `gateway01.us-east-1.prod.aws.tidbcloud.com`)
   - **Port** (e.g. `4000` or `3306`)
   - **User** (e.g. `xxxxxx.root`)
   - **Password** (the password you created)
   - **Database Name** (e.g. `test` or create `temple_db`)

> 💡 **Auto-Table Creation**: You don't need to run any SQL commands manually! When your app connects on Render, it automatically creates all required tables (`financial_years`, `income`, `expenses`, `current_balance`, etc.).

---

## Step 2: Push Your Code to GitHub

If you haven't uploaded your project to GitHub yet:

1. Open [https://github.com](https://github.com) and create a **New Repository** named `temple-management-system` (set it to Public or Private).
2. On your computer terminal in this project folder (`temple-management-system`), run:

```bash
git init
git add .
git commit -m "Prepare Temple Management System for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/temple-management-system.git
git push -u origin main
```

*(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)*

---

## Step 3: Deploy on Render

1. Go to [https://render.com](https://render.com) and Sign Up / Log In (you can log in with GitHub).
2. In your Render Dashboard, click **New +** and select **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Connect your GitHub account and select your `temple-management-system` repository.
5. Fill in the deployment details:
   - **Name**: `temple-management-system` (or your preferred site name)
   - **Region**: Closest to your users (e.g., *Singapore*, *Oregon*, *Frankfurt*)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

---

## Step 4: Configure Environment Variables on Render

On the same Render setup page (or in **Settings > Environment**):

Add the following **Environment Variables**:

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `SESSION_SECRET` | *(Random string or click Generate)* | Secret for login sessions |
| `DB_HOST` | `your-db-host.tidbcloud.com` | Your Cloud MySQL Host |
| `DB_PORT` | `4000` *(or `3306`)* | Cloud MySQL Port |
| `DB_USER` | `your_db_username` | Cloud MySQL Username |
| `DB_PASSWORD` | `your_db_password` | Cloud MySQL Password |
| `DB_NAME` | `test` *(or `temple_db`)* | Cloud MySQL Database Name |
| `DB_SSL` | `true` | Enables secure SSL for cloud MySQL |

*(Alternatively, if your database provider gave you a full `DATABASE_URL` or `MYSQL_URL`, you can simply add the single variable `DATABASE_URL` with your full connection string!)*

---

## Step 5: Click Deploy & Access Your Live Website

1. Click **Deploy Web Service** (or **Create Web Service**).
2. Render will build and launch your application. You will see logs in the dashboard:
   ```
   ==> Build successful 🎉
   ==> Starting service with 'npm start'
   Server running on port 10000
   [Database] MySQL Connected successfully via Connection Pool
   [DB Init] All database tables verified and ready.
   ==> Your service is live 🚀
   ```
3. Your live website link will appear at the top of the Render dashboard (e.g. `https://temple-management-system.onrender.com`).
4. Anyone with this link can now open the live website, log in (`Nainar` / `Nainar`), manage financial years, add donations, record expenses, and generate reports!

---

## 🛠️ Local Development (Running locally)

To run the project on your local machine:

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Create a `.env` file copying from `.env.example` if you want custom DB credentials.
3. Start the server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
