FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=build /app/dist ./dist
EXPOSE 3002
CMD ["vite", "preview", "--port", "3002", "--host"]
