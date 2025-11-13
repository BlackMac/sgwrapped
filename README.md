## sipgate Year in Review

Log in with sipgate OAuth and remix your PBX history into a Spotify-style wrap-up. The app uses NextAuth.js for authentication and the official `sipgateio` SDK to fetch call history/statistics.

### Features
- Secure OAuth login with PKCE/state checks (Auth.js / NextAuth v5 App Router mode).
- Server-only ingestion of sipgate call history with `sipgateio`.
- Aggregated insights (total talk time, streaks, top contacts, busiest hour/month).
- Playful UI inspired by Spotify Wrapped with responsive cards and charts.

### Getting started
1. **Install dependencies**
   ```bash
   npm install next-auth sipgateio
   ```
2. **Create your env file**
   ```bash
   cp .env.example .env.local
   ```
3. **Fill in the env values**
   - `AUTH_SECRET`: random string for NextAuth.
   - `SIPGATE_CLIENT_ID` / `SIPGATE_CLIENT_SECRET`: from your sipgate OAuth app.
   - `SIPGATE_OAUTH_*` URLs: `https://login.sipgate.com/auth/realms/third-party/protocol/openid-connect/auth` (authorize), `https://login.sipgate.com/auth/realms/third-party/protocol/openid-connect/token` (token), and `https://login.sipgate.com/auth/realms/third-party/protocol/openid-connect/userinfo` (userinfo) per https://en.sipgate.io/rest-api/authentication. The OpenID userinfo endpoint returns the actual web user’s email, not just the account owner.
   - `SIPGATE_OAUTH_SCOPE`: must include at least `history:read` and `numbers:read`.
4. **Run the app**
   ```bash
   npm run dev
   ```
5. Visit `http://localhost:3000`, sign in with sipgate, and enjoy your recap.

### Notes
- Tokens stay on the server; we only request data required for the recap.
- Update scopes if you add more stats (voicemail, SMS, etc.).
