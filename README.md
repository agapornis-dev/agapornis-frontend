# Agapornis Frontend

> **Beta software:** Agapornis is under active development and may introduce breaking changes between releases.

Next.js 16 panel UI for the Agapornis API. Browser requests stay on the frontend origin and pass through authenticated Next.js API routes; `AGAPORNIS_API_URL` is used only by the server and is not exposed as the browser's API endpoint.

## Requirements

- Node.js 22 or newer
- npm
- A reachable `agapornis-api` instance

## Development

```bash
npm ci
AGAPORNIS_API_URL=http://127.0.0.1:3001/api npm run dev
```

The development server listens on port `3000`. The first account registered through a new API installation becomes the owner.

## Production build

```bash
npm ci
AGAPORNIS_API_URL=http://127.0.0.1:3001/api \
AGAPORNIS_FRONTEND_VERSION=1.0.0 \
npm run build
npm prune --omit=dev
npm start
```

NGINX or Traefik should terminate HTTPS and proxy the public panel hostname to `127.0.0.1:3000`. The frontend does not need its own certificate or CA. Do not expose port `3000` directly. `next.config.js` enables standalone output, although the supplied native service launches the installed Next.js runtime directly. Keep `AGAPORNIS_FRONTEND_VERSION` set in production: the frontend sends it to the API so the Updates screen can compare the installed version with the latest frontend release.

## Native systemd installation

The recommended host layout keeps immutable releases and switches a `current` symlink:

```text
/opt/agapornis/frontend/releases/<version>
/opt/agapornis/frontend/current
/etc/agapornis/frontend.env
/var/lib/agapornis/frontend/version.env
```

After extracting a release source archive and building it under a versioned directory:

```bash
useradd --system --home-dir /opt/agapornis --shell /usr/sbin/nologin agapornis 2>/dev/null || true
ln -sfn /opt/agapornis/frontend/releases/1.0.0 /opt/agapornis/frontend/current
install -m 0644 deploy/agapornis-frontend.service /etc/systemd/system/agapornis-frontend.service
systemctl daemon-reload
systemctl enable --now agapornis-frontend.service
```

Create `/etc/agapornis/frontend.env`:

```dotenv
NODE_ENV=production
AGAPORNIS_API_URL=http://127.0.0.1:3001/api
CSRF_SECRET=replace-with-a-long-random-secret
```

Create `/var/lib/agapornis/frontend/version.env` with the installed release version:

```dotenv
AGAPORNIS_FRONTEND_VERSION=1.0.0
```

The unit resolves Node from its systemd `PATH` and listens only on `127.0.0.1:3000` for the local reverse proxy. Set `Environment=PATH=...` or adjust `ExecStart` if Node or the private port differs on your host.

## Updates

Frontend releases are independent from API releases. A tag publishes:

- `agapornis-frontend-source.tar.gz`
- `agapornis-frontend-source.tar.gz.sha256`
- `release-manifest.json`
- `agapornis-frontend.service`

The API reads the latest manifest from this repository and reports the frontend release independently. A native supervisor downloads and deploys the frontend only when `frontend` is listed in `AGAPORNIS_PANEL_UPDATE_COMPONENTS` on a host that has the frontend installation. API-only hosts leave a remote frontend unmanaged. The supervisor supports independent frontend root and state paths; see the API README for the updater unit, paths, and permissions.

The admin update screen separates agent staging from activation. It offers **Stage update** only when a newer release is available, and **Restart & update** only when the agent reports a verified staged artifact with a pending restart. It does not expose a general agent restart control.

Free installations retain a visible **Powered by Agapornis** footer credit, including on the maintenance screen. The API supplies this attribution through public settings and does not add a watermark header to normal responses. Removing the visible credit requires a separately issued commercial branding entitlement. See [ATTRIBUTION.md](ATTRIBUTION.md) for the AGPLv3 section 7(b) attribution term.

## Supporting Agapornis

Supporting any of the Agapornis projects helps sustain maintenance, security work, documentation, and future releases. Contributions can include code, testing, issue reports, documentation improvements, community help, or financial sponsorship. The independently released projects are [agapornis-api](https://github.com/agapornis-dev/agapornis-api), [agapornis-frontend](https://github.com/agapornis-dev/agapornis-frontend), and [agapornis-agent-rust](https://github.com/agapornis-dev/agapornis-agent-rust).

## Publishing a release

Update `package.json` and `package-lock.json`, then push the matching tag:

```bash
npm version 0.2.0
git push origin main --follow-tags
```

`.github/workflows/release.yml` runs a production build, packages only tracked source files, generates the checksummed component manifest, and creates the GitHub release. `.env` is explicitly excluded from the archive. The workflow rejects a tag that does not equal `v<package version>`.

## Styling

Global design tokens live in `styles/globals.css`. The panel offers **Auto**, **Dark**, and **Light** controls. Auto follows `prefers-color-scheme`, while an explicit selection is saved in the browser and applied before the page paints. The main theme colors can be changed at the root:

```css
:root {
  --background: #f6f7f9;
  --card: #ffffff;
  --primary: #191b20;
}
```
