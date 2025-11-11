# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps with good caching
COPY package*.json ./
RUN npm ci

# Copy source and build (Parcel outputs to /dist by default)
COPY . .
# If you need env values baked in, pass them with --build-arg and read in your code
# ARG VITE_API_URL
# ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---- runtime stage ----
FROM nginx:alpine

# Optional: SPA routing (see nginx.conf below)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the built static site
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
