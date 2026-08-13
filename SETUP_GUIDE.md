# Setup Guide — Run Plantea on Your Phone (100% Free)

This guide covers every way to run Plantea on a real phone or tablet
without paying for anything. There are **three options**, from simplest to
most "real world":

1. **Same-WiFi (LAN)** — phone and PC on the same network. Zero accounts,
   zero cost, best for testing.
2. **Expo Tunnel** — phone anywhere in the world talks to your PC through a
   free tunnel from Expo. Great for demos.
3. **Free host + free tunnel** — run the backend on a free host and expose
   it through a free tunnel so anyone can use the app.

Plantea's whole stack is free and self-hosted:

| Component   | What it uses                                      | Cost |
|-------------|---------------------------------------------------|------|
| Database    | SQLite (a single file, no server)                 | Free |
| Backend     | Node.js + Express (REST API on port 3000)         | Free |
| Frontend    | Expo / React Native + React Native Web            | Free |
| Payments    | Cash on Delivery + EasyPaisa (offline)            | 0% commission |
| Images      | Self-hosted in `plantea-backend/uploads/`         | Free |
| Auth        | Local email/password, no third-party providers    | Free |

No paid tiers, no external accounts, no credit card.

---

## Option 1 — Same WiFi (LAN). Fastest.

### What you need
- PC (Windows / macOS / Linux) with Node.js installed.
- Phone with the free **Expo Go** app (App Store / Play Store).
- Both devices on the **same WiFi network**.

### Steps

1. Install dependencies once (from the project root):

```bash
npm run install:all
```

2. Auto-configure the API URL to your PC's WiFi IP:

```bash
node plantea-frontend/scripts/setup-local.js
```

This writes `plantea-frontend/.env` with
`EXPO_PUBLIC_API_BASE_URL=http://<YOUR_PC_IP>:3000/api`.

3. Start the backend in terminal 1:

```bash
npm run backend
```

4. Start the Expo dev server in terminal 2:

```bash
npm run frontend
```

5. On your phone:
   - Open **Expo Go**.
   - Tap **Enter URL manually** and type:

```
exp://<YOUR_PC_IP>:8081
```

   - Or scan the QR code shown in the terminal.

6. Verify the backend is reachable from the phone's browser:

```
http://<YOUR_PC_IP>:3000/health
```

You should see `{"success":true,...}`.

### Notes for LAN mode
- Keep the PC awake; closing the terminal stops the app.
- If the PC's IP changes (new WiFi / router restart), re-run
  `node plantea-frontend/scripts/setup-local.js`.
- If the phone can't connect, allow Node.js through the firewall
  (Windows Defender Firewall → Allow an app → Node.js).

---

## Option 2 — Expo Tunnel (phone works from anywhere)

If the phone and PC are on different networks (e.g. phone on mobile data),
use Expo's free tunnel so the phone can reach the dev server.

1. Start the backend as usual:

```bash
npm run backend
```

2. Start Expo in tunnel mode:

```bash
npx expo start --tunnel
```

3. Open **Expo Go** on the phone and scan the QR code. Expo creates a free
   `exp://xxxxx.exp.direct/...` tunnel URL automatically.

4. The phone must still reach the **backend**. On the same WiFi use
   Option 1's `http://<PC_IP>:3000/api`. For a phone on mobile data, expose
   the backend too — see Option 3.

### Notes for tunnel mode
- Expo tunnel relays the Metro bundler, not the backend. The API base URL
  still points at your backend.
- Free tier throughput is fine for development/demos.

---

## Option 3 — Free host + free tunnel (real deployment)

This is the "production-shaped" setup: backend on a free host, frontend on
a free tunnel, both reachable by anyone with the URL.

### Backend on a free host
Plantea runs anywhere that supports Node.js. Pick one free option:

- **Render** — free web service, Node.js supported, no credit card for the
  free tier.
- **Railway** — free starter plan, Node.js supported.
- **Fly.io** — small free allowance.
- **A spare PC / Raspberry Pi** at home — no host at all, just run
  `npm run backend`.

Steps on the host:

```bash
cd plantea-backend
npm install
node server.js
```

Set one environment variable on the host (Render/Railway dashboards have an
env section):

```
PORT=3000
NODE_ENV=production
```

After the first boot the SQLite file is created inside the service's
`data/` folder automatically, and the 12 demo plants are seeded with their
photos.

### Free tunnel to the backend
When the host has no public URL, or you want HTTPS, use a free tunnel such
as **Cloudflare Tunnel (TryCloudflare)** or **localhost.run**:

```bash
# Cloudflare quick tunnel (free, no account needed)
cloudflared tunnel --url http://localhost:3000

# or localhost.run
ssh -R 80:localhost:3000 nokey@localhost.run
```

Copy the generated `https://xxxxx.trycloudflare.com` URL. It proxies to your
backend, so:

```
API base: https://xxxxx.trycloudflare.com/api
Health:   https://xxxxx.trycloudflare.com/health
Images:   https://xxxxx.trycloudflare.com/uploads/...
```

### Frontend pointing at the tunnel

Create/edit `plantea-frontend/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://xxxxx.trycloudflare.com/api
EXPO_PUBLIC_API_TIMEOUT=10000
```

Then either:

- Run the app locally to see it on your phone:

```bash
npx expo start
```

- Or build a web bundle for the same tunnel URL:

```bash
EXPO_PUBLIC_API_BASE_URL=https://xxxxx.trycloudflare.com/api \
  npx expo export --platform web
```

### What stays free in this option
- SQLite — no database server, no fees.
- Cloudflare TryCloudflare / localhost.run — free, no account needed.
- Render / Railway free tiers — no credit card required.
- COD + EasyPaisa — no payment-provider commissions.

---

## Environment reference

| Variable                     | Default       | Purpose                              |
|------------------------------|---------------|--------------------------------------|
| `EXPO_PUBLIC_API_BASE_URL`   | `/api`        | Backend API prefix the app calls. Set to `http://<IP>:3000/api`, `exp://.../api`, or a public `https://.../api`. |
| `EXPO_PUBLIC_API_TIMEOUT`    | `10000`       | Request timeout in milliseconds.     |
| `PORT` (backend)             | `3000`        | Backend HTTP port.                   |
| `NODE_ENV` (backend)         | `development` | `production` disables test bypasses. |

## Ports

| Port | Who listens                       |
|------|-----------------------------------|
| 3000 | Backend REST API + web bundle     |
| 8081 | Expo dev server (Metro / QR code) |

## Demo accounts (password: `Test1234`)

| Role   | Email                  |
|--------|------------------------|
| Buyer  | shehroz@test.com       |
| Seller | zainab@test.com        |
| Rider  | bilal@test.com         |
| Admin  | admin@plantea.com      |

## Troubleshooting

| Symptom                        | Fix                                                                 |
|--------------------------------|---------------------------------------------------------------------|
| `Cannot connect to server`     | Wrong `EXPO_PUBLIC_API_BASE_URL`; verify with `/health` in a phone browser. |
| Phone can't reach PC           | Same WiFi? Firewall allow Node.js? IP changed? Re-run `setup-local.js`. |
| Expo Go can't load app         | Use `npx expo start --tunnel` when not on the same network.         |
| Photos don't load              | Images are served at `/uploads/...` from the backend; confirm the API URL ends in `/api` and images load at `/uploads/planta_img_monstera.jpg`. |
| Backend restarts, data gone    | SQLite file lives in `plantea-backend/data/`; back it up or attach a persistent disk on free hosts. |
