FROM oven/bun:1.3.14-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json bun.lock ./
RUN bun ci
COPY . .
ARG AGAPORNIS_VERSION=1.0.0
ENV AGAPORNIS_FRONTEND_VERSION=$AGAPORNIS_VERSION
RUN bun run build

FROM oven/bun:1.3.14-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
ARG AGAPORNIS_VERSION=1.0.0
ENV AGAPORNIS_FRONTEND_VERSION=$AGAPORNIS_VERSION
# AGAPORNIS_API_URL and CSRF_SECRET are injected by Docker at runtime.
# The entrypoint validates them without persisting CSRF_SECRET in image metadata.
COPY --from=build --chown=bun:bun /app/.next/standalone ./
COPY --from=build --chown=bun:bun /app/.next/static ./.next/static
COPY --from=build --chown=bun:bun /app/public ./public
USER bun
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["bun", "server.js"]
