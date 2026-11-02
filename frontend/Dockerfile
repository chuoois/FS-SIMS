# ---------- Base ----------


FROM node:20-alpine3.21 AS base
WORKDIR /app
COPY package*.json ./

# ---------- Development (Vite dev server, hot reload) ----------
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------- Build static files ----------
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# ---------- Production (serve bằng Nginx) ----------
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
