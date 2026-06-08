# Ubuntu VPS Deployment Guide

This guide details how to deploy the Multi-Tenant Lead Management CRM SaaS application to a production Ubuntu VPS utilizing PM2, Nginx, MySQL, and Certbot for SSL.

---

## 1. System Requirements & Preparation

Log in to your Ubuntu server via SSH:
```bash
ssh root@your_server_ip
```

### Update Package Lists
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Required Dependencies
```bash
sudo apt install -y curl git nginx mysql-server certbot python3-certbot-nginx
```

---

## 2. Node.js & PM2 Installation

Install Node.js (LTS version) using the NodeSource setup script:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify the installations:
```bash
node -v
npm -v
```

Install PM2 globally:
```bash
sudo npm install -y pm2 -g
```

---

## 3. Database Setup (MySQL)

Secure your MySQL database installation:
```bash
sudo mysql_secure_installation
```

Log in to the MySQL command line:
```bash
sudo mysql -u root -p
```

Execute SQL queries to create the database and dedicate a database user:
```sql
CREATE DATABASE crm_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'choose_a_strong_password_here';
GRANT ALL PRIVILEGES ON crm_saas.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Application Cloning & Configuration

Clone your project repository (or upload the files) to `/var/www/crm-saas`:
```bash
sudo mkdir -p /var/www/crm-saas
sudo chown -R $USER:$USER /var/www/crm-saas
cd /var/www/crm-saas
git clone <your_repo_url> .
```

Install production dependencies:
```bash
npm install --omit=dev
```

Create a production `.env` configuration file:
```bash
nano .env
```

Fill in the production environment variables:
```ini
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-crm-domain.com

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=crm_user
DB_PASSWORD=choose_a_strong_password_here
DB_NAME=crm_saas

JWT_SECRET=generate_a_random_hash_here_for_access_token
JWT_REFRESH_SECRET=generate_a_random_hash_here_for_refresh_token

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key_here
SMTP_FROM=no-reply@your-crm-domain.com

STORAGE_TYPE=local
UPLOAD_DIR=public/uploads

USE_REDIS=false
```

---

## 5. Build and Launch using PM2

Compile the Next.js production bundle:
```bash
npm run build
```

Launch the application utilizing PM2:
```bash
pm2 start server.js --name crm-saas
```

Ensure PM2 restarts automatically on server reboots:
```bash
pm2 startup
```
*(Copy and run the command printed in your shell output by the previous command)*

Save current PM2 tasks list:
```bash
pm2 save
```

---

## 6. Nginx Reverse Proxy Setup

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/crm-saas
```

Add the following reverse proxy block (which passes standard HTTP requests and WebSockets to the Node.js/Next.js port `3000`):

```nginx
server {
    listen 80;
    server_name your-crm-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Restrict uploads folder access to raw reading
    location /uploads/ {
        root /var/www/crm-saas/public;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    client_max_body_size 20M;
}
```

Enable the Nginx site configuration:
```bash
sudo ln -s /etc/nginx/sites-available/crm-saas /etc/nginx/sites-enabled/
```

Remove default configuration:
```bash
sudo rm /etc/nginx/sites-enabled/default
```

Test Nginx configuration for syntax errors:
```bash
sudo nginx -t
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## 7. SSL Certificate Installation (HTTPS)

Secure your domain utilizing free Let's Encrypt SSL certificates via Certbot:
```bash
sudo certbot --nginx -d your-crm-domain.com
```

Select option `2` to redirect all HTTP traffic automatically to HTTPS.

---

## 8. Managing and Monitoring App

Here are useful commands to manage your running production CRM:

- **Check Process Status:** `pm2 status`
- **Inspect Live Logs:** `pm2 logs crm-saas`
- **Restart CRM App:** `pm2 restart crm-saas`
- **Stop CRM App:** `pm2 stop crm-saas`
- **Reload Code Changes (Zero-Downtime):** `pm2 reload crm-saas`
