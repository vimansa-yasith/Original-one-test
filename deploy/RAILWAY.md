# Deploying FlexiWork to Railway

This repo deploys as **3 Railway services** + **1 Railway MySQL plugin**, all inside
one Railway *project* (so they share a private network and can reach each
other by `<service-name>.railway.internal`):

| Service           | Root directory     | Dockerfile                     | Public domain? |
|--------------------|--------------------|---------------------------------|-----------------|
| `backend`          | `/` (repo root)    | `Dockerfile`                    | optional        |
| `frontend`         | `frontend/`        | `frontend/Dockerfile`           | **yes**         |
| `whatsapp-service` | `whatsapp-service/`| `whatsapp-service/Dockerfile`   | no              |
| MySQL              | (Railway plugin, not a Dockerfile) | — | no |

The frontend is the only thing users hit directly: its nginx proxies
`/api/*`, `/admin/*`, and static admin/Swagger/upload paths to the backend
over Railway's private network (same trick `deploy/nginx.conf` already used
for the VPS, just pointed at `*.railway.internal` instead of `127.0.0.1`).

## 1. Create the project and add MySQL
1. New Railway project → **Add MySQL** (the official plugin). Railway will
   expose `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`,
   `MYSQLDATABASE` as reference variables you can pull into the backend
   service below.

## 2. Backend service
- **New Service → Deploy from repo**, root directory `/` (it will find the
  root `Dockerfile` automatically).
- Variables (use Railway's "reference variable" picker to pull the `MYSQL*`
  ones straight from the MySQL plugin instead of retyping them):
  ```
  DB_URL=jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}?createDatabaseIfNotExist=true&serverTimezone=Asia/Colombo&allowPublicKeyRetrieval=true&useSSL=false
  DB_USERNAME=${{MySQL.MYSQLUSER}}
  DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
  JWT_SECRET=<openssl rand -base64 48>
  WHATSAPP_SHARED_SECRET=<openssl rand -base64 48>
  WHATSAPP_SERVICE_URL=http://whatsapp-service.railway.internal:3001
  FLEXIWORK_PUBLIC_BASE_URL=https://<your-frontend-domain>.up.railway.app
  FLEXIWORK_CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>.up.railway.app
  SPRING_PROFILES_ACTIVE=prod
  SPRING_MAIL_USERNAME=<gmail address>          # optional, blank = OTPs log to console instead of emailing
  SPRING_MAIL_PASSWORD=<gmail app password>     # optional
  ```
- **Add a Volume** mounted at `/app/uploads` — the container filesystem is
  wiped on every redeploy, and worker/company KYC files + QR images must
  survive that.
- First deploy: temporarily set `SPRING_PROFILES_ACTIVE=dev` so
  `ddl-auto: update` creates the schema, watch the deploy logs to confirm
  tables were created, then switch it to `prod` (which uses
  `ddl-auto: validate` and refuses to silently mutate the schema afterward)
  and redeploy.
- You generally don't need a public domain on this service — the frontend
  reaches it privately. Only expose one if you want to hit `/api`,
  `/swagger-ui` (dev profile only), or `/admin` directly without going
  through the frontend domain.

## 3. WhatsApp microservice
- **New Service → Deploy from repo**, root directory `whatsapp-service/`
  (uses `whatsapp-service/Dockerfile`, which installs Chromium for
  Puppeteer).
- Variables: `WHATSAPP_SHARED_SECRET=<same value as the backend's>`.
- **Add a Volume** mounted at `/app/session` so the linked WhatsApp account
  survives redeploys — without it you'd have to rescan the QR code every
  time the container restarts.
- No public domain needed.
- After the first deploy, open this service's **Logs** tab: it prints a QR
  code in plain text. Scan it from WhatsApp → Linked Devices → Link a
  Device. Once you see "✅ WhatsApp client ready", it's done — the session
  volume keeps it linked.
- If WhatsApp isn't needed for your demo, skip this service entirely and set
  `flexiwork.whatsapp.enabled=false` on the backend (notifications will just
  log to the console instead).

## 4. Frontend service
- **New Service → Deploy from repo**, root directory `frontend/` (uses
  `frontend/Dockerfile`, which builds the Vite app then serves it via
  nginx).
- Variables:
  ```
  BACKEND_HOST=<backend-service-name>.railway.internal:8080
  ```
  (Use the exact internal service name Railway shows for the backend
  service — visible on that service's **Settings → Networking** tab.)
- **Generate a public domain** for this service (Settings → Networking →
  Generate Domain). This is the URL your users/markers will actually visit.
- Set the backend's `FLEXIWORK_PUBLIC_BASE_URL` and
  `FLEXIWORK_CORS_ALLOWED_ORIGINS` (step 2) to this domain once it's known.

## 5. Verify
- Visit the frontend's public domain → the React app should load, and
  `/api/jobs` (proxied through nginx) should return data.
- Visit `<frontend-domain>/admin` → Thymeleaf admin login should load and
  authenticate against the backend.
- Check the backend service logs for `Started FlexiWorkApplication`.

## Redeploying after code changes
Push to the branch each service tracks (or trigger a manual redeploy in the
Railway dashboard) — Railway rebuilds the relevant service's Dockerfile
automatically. No SSH/systemd steps needed, unlike the VPS path in
`deploy/DEPLOY.md`.

## Notes / gotchas
- `application-prod.yml` sets session cookies `secure: true` — fine on
  Railway since every service gets HTTPS by default.
- The backend's `ddl-auto: validate` in prod means schema changes need a
  one-time `dev`-profile deploy (see step 2) or a manual migration; it will
  never silently alter tables in `prod`.
- Don't reuse the VPS `deploy/nginx.conf` / `deploy/*.service` files here —
  those are for the systemd+nginx VPS path in `deploy/DEPLOY.md`, not
  Railway. Railway's equivalent of that nginx config is
  `frontend/nginx.conf.template`.
