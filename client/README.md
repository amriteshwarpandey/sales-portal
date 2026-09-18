# Sales Portal: client

Next.js 16 front end for the Sales Portal. See the [root README](../README.md) for setup, features and the API.

```bash
npm install
npm run dev     # http://localhost:3000 (needs the server running on :5000)
npm run build
npm run lint
```

Environment (optional, see `.env.example`):

- `API_URL`: where the Express API runs (default `http://localhost:5000`); `/api/*` is proxied there
- `NEXT_PUBLIC_SOCKET_URL`: Socket.IO endpoint for live updates (default `http://localhost:5000`)
