# ---------- Base ----------
FROM node:20-alpine3.21 AS base
WORKDIR /app
COPY package*.json ./

# ---------- Development ----------
FROM base AS development
ENV NODE_ENV=development
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---------- Build dependencies cho production ----------
FROM base AS build
ENV NODE_ENV=production
RUN npm install --omit=dev --legacy-peer-deps
COPY . .

# ---------- Production ----------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 5000
CMD ["npm", "start"]
