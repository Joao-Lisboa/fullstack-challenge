FROM oven/bun:1-alpine

RUN apk add --no-cache openssl curl

WORKDIR /app/packages/events
COPY packages/events/package.json ./
COPY packages/events/src ./src

WORKDIR /app/services/games
COPY services/games/package.json ./
RUN sed -i 's|"@crash/events": "workspace:\*"|"@crash/events": "file:../../packages/events"|' package.json && bun install --ignore-scripts

COPY services/games ./
RUN bunx prisma generate
RUN chmod +x docker-entrypoint.sh

EXPOSE 4001

CMD ["./docker-entrypoint.sh"]
