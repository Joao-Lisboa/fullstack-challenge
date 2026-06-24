FROM oven/bun:1-alpine

RUN apk add --no-cache openssl curl

WORKDIR /app/packages/events
COPY packages/events/package.json ./
COPY packages/events/src ./src

WORKDIR /app/services/wallets
COPY services/wallets/package.json ./
RUN sed -i 's|"@crash/events": "workspace:\*"|"@crash/events": "file:../../packages/events"|' package.json && bun install --ignore-scripts

COPY services/wallets ./
RUN bunx prisma generate
RUN chmod +x docker-entrypoint.sh

EXPOSE 4002

CMD ["./docker-entrypoint.sh"]
