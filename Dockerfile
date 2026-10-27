FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY build.js ./
COPY src ./src
COPY public ./public
RUN node build.js

FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY --from=build /app/dist ./dist
COPY media ./media
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data MEDIA_DIR=/app/media
VOLUME ["/data"]
EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.js"]
