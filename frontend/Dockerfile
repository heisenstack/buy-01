FROM node:22-alpine

WORKDIR /app

# Install openssl to generate certificates inside the container
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .

# Automatically generate a self-signed SSL certificate during build
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/CN=localhost"

EXPOSE 4200

CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "4200", "--ssl", "true", "--ssl-key", "server.key", "--ssl-cert", "server.crt"]