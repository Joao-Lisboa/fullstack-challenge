FROM oven/bun:1-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN bun install

COPY frontend/ ./

ARG VITE_API_URL=http://localhost:8000
ARG VITE_KEYCLOAK_ISSUER=http://localhost:8080/realms/crash-game
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_ISSUER=$VITE_KEYCLOAK_ISSUER

RUN bun run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
