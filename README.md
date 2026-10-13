# Buy 01 - Microservices E-Commerce Platform

A secure, observable, and scalable end-to-end e-commerce platform built with **Spring Boot microservices** on the backend and **Angular** on the frontend.

---

## Architecture Overview

```
                                +-------------------+
                                | Angular Frontend  |
                                | (HTTPS: 4200)     |
                                +---------+---------+
                                          |
                                          | HTTPS / JWT
                                          v
                              +-----------+-----------+
                              |      API Gateway      |
                              |      (HTTPS: 8443)    |
                              +-----------+-----------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+-------+---------+              +--------+--------+              +---------+-------+
|  User Service   |              | Product Service |              |  Media Service  |
|  (Port: 8081)   |              |  (Port: 8082)   |              |  (Port: 8083)   |
+-------+---------+              +--------+--------+              +---------+-------+
        |                                 |                                 |
        v                                 v                                 v
+-------+---------+              +--------+--------+              +---------+-------+
|  MongoDB Users  |              |MongoDB Products |              | MongoDB Media   |
| (buy01_users)   |              |(buy01_products) |              |  & Cloudinary   |
+-----------------+              +-----------------+              +-----------------+
        ^                                 ^                                 ^
        |                                 |                                 |
        +---------------------------------+---------------------------------+
                                          | Service Discovery
                                          v
                                 +--------+--------+
                                 | Eureka Server   |
                                 |  (Port: 8761)   |
                                 +-----------------+
```

### Components:
- **Discovery Service (`discovery`)**: Netflix Eureka server for internal dynamic service discovery.
- **API Gateway (`gateway`)**: Spring Cloud Gateway running with SSL/TLS (port 8443). Validates JWT tokens, enforces RBAC (`CLIENT` vs `SELLER`), and propagates identity headers (`X-User-Email`, `X-User-Role`, `X-User-Username`) downstream.
- **User Service (`user-service`)**: Handles authentication (BCrypt password hashing, JWT issuing) and user profiles (`GET /me`, `PUT /me`).
- **Product Service (`product-service`)**: Product catalog management with pagination, role validation, and seller ownership enforcement.
- **Media Service (`media-service`)**: Image upload and storage with Cloudinary, file size limits (≤ 2 MB), header/magic-byte sniffing verification, and caching headers.
- **Frontend (`frontend`)**: Angular Single Page Application with standalone components, Signals, Reactive Forms, Angular Material, Route Guards (`authGuard`, `sellerGuard`, `loginGuard`), and an HTTP Interceptor handling 401/403.
- **Database (`mongo`)**: MongoDB 7 instance providing polyglot persistence across independent service databases (`buy01_users`, `buy01_products`, `buy01_media`).

---

## Prerequisites

- [Podman](https://podman.io/) (v4.0+) & [Podman Compose](https://github.com/containers/podman-compose)
  *(Alternatively: Docker & Docker Compose)*
- A modern web browser (Chrome, Firefox, Edge)
- (Optional) Postman or `curl` for API inspection

---

## Quick Start (Podman Compose)

### 1. Environment Configuration

The repository includes a ready-to-use `.env` file containing default credentials, JWT secrets, and Cloudinary configuration.

```bash
# Verify .env exists in the project root
ls -la .env
```

### 2. Launch the Application

Build and start all microservices using `podman compose`:

```bash
podman compose up --build
```

To run in the background (detached mode):

```bash
podman compose up -d --build
```

### 3. Check Service Status & Logs

```bash
# View running containers
podman compose ps

# View service logs
podman compose logs -f

# View logs for a specific service (e.g. gateway)
podman compose logs -f gateway
```

### 4. Stop the Application

```bash
podman compose down
```

To stop and remove database volumes:

```bash
podman compose down -v
```

---

## Accessing the Platform

| Service | Protocol / Port | URL | Description |
|---|---|---|---|
| **Frontend UI** | HTTPS : 4200 | `https://localhost:4200` | Angular Storefront & Seller Portal |
| **API Gateway** | HTTPS : 8443 | `https://localhost:8443` | Main secure entrypoint for all APIs |
| **Eureka Discovery** | HTTP : 8761 | `http://localhost:8761` | Eureka Registry Dashboard |
| **User Service** | HTTP : 8081 | `http://localhost:8081` | Direct service (internal network) |
| **Product Service** | HTTP : 8082 | `http://localhost:8082` | Direct service (internal network) |
| **Media Service** | HTTP : 8083 | `http://localhost:8083` | Direct service (internal network) |
| **MongoDB** | TCP : 27017 | `localhost:27017` | Database server (internal network) |

> **Important (Self-Signed SSL Certificates)**:  
> Because HTTPS uses automatically generated self-signed certificates during build:
> 1. Open `https://localhost:4200` in your browser and click **Advanced -> Proceed to localhost (unsafe)**.
> 2. Open `https://localhost:8443/actuator/health` in your browser and accept the certificate for the API gateway as well.

---

## User Roles & Workflows

1. **Client**:
   - Register with role `CLIENT` on `https://localhost:4200/login`.
   - Browse the public product catalog with prices, quantities, seller details, and images.
   - View individual product details and gallery carousel.
   - Access and update their personal profile username (`/profile`).
   - Write actions (creating products, uploading media) are strictly prohibited.

2. **Seller**:
   - Register with role `SELLER` on `https://localhost:4200/login`.
   - Access **Seller Dashboard** (`/dashboard`): view stock inventory statistics and created listings.
   - Create products with images (image type and ≤ 2 MB enforced client-side and server-side).
   - Edit, update, and delete owned products.
   - Update seller profile avatar and sync seller name across all listings.

---

## API Endpoints Reference

All external API requests pass through the API Gateway at `https://localhost:8443`.  
Gateway routes use `StripPrefix=2` (stripping `/api/<service>`), so the endpoints below correspond directly to both the Angular frontend calls and Postman testing:

### 1. Authentication & Users (`/api/users/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/users/auth/register` | Public | Register user (`username`, `email`, `password`, `role: CLIENT\|SELLER`) |
| `POST` | `/api/users/auth/login` | Public | Authenticate and obtain JWT token |
| `GET` | `/api/users/me` | Authenticated | Retrieve authenticated user profile |
| `PUT` | `/api/users/me` | Authenticated | Update username or avatar media reference |

### 2. Products (`/api/products/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products/products` | Public | Paginated product list (`page`, `size`) |
| `GET` | `/api/products/products/{id}` | Public | Get single product by ID |
| `GET` | `/api/products/products/mine` | Seller only | Get authenticated seller's products |
| `POST` | `/api/products/products` | Seller only | Create product (`name`, `description`, `price`, `quantity`, `imageIds`) |
| `PUT` | `/api/products/products/{id}` | Seller (Owner) | Update product (enforces ownership check) |
| `DELETE` | `/api/products/products/{id}` | Seller (Owner) | Delete product (enforces ownership check) |
| `PUT` | `/api/products/products/seller-name` | Seller only | Update seller display name on existing products |

### 3. Media (`/api/media/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/media/media/images` | Seller only | Upload image (multipart/form-data, ≤ 2 MB, verified magic bytes) |
| `GET` | `/api/media/media/images/{id}` | Public | Retrieve image (302 redirect with `Cache-Control` header) |
| `DELETE` | `/api/media/media/images/{id}` | Seller (Owner) | Delete media from Cloudinary and DB |

### 4. Health & Observability
All services expose Spring Boot Actuator health endpoints:
- Gateway: `GET https://localhost:8443/actuator/health`
- Eureka: `GET http://localhost:8761/actuator/health`
- User Service: `GET http://localhost:8081/actuator/health`
- Product Service: `GET http://localhost:8082/actuator/health`
- Media Service: `GET http://localhost:8083/actuator/health`

---

## Security Specifications

1. **End-to-End HTTPS**:
   - API Gateway runs on port 8443 with PKCS12 keystore.
   - Angular UI serves over HTTPS on port 4200.
2. **Password Security**:
   - Passwords hashed using Spring Security `BCryptPasswordEncoder`.
   - Raw passwords never stored or returned in any DTO.
3. **Strict Upload Verification (Content Sniffing)**:
   - File size enforced at ≤ 2 MB both in Angular UI and Spring Boot (`max-file-size: 2MB`).
   - Browser MIME header validated against `image/*`.
   - File byte stream checked via magic number signatures for JPEG, PNG, GIF, WebP, and BMP. Disguised scripts/binaries are rejected with `400 Bad Request`.
   - Path traversal prevention on uploaded filenames.
4. **Ownership Enforcement**:
   - Product and media modifications verify `sellerEmail == authentication.getName()`.
   - Unauthorized attempts return `403 Forbidden`.
5. **CORS**:
   - Gateway configures strict allowed origins (`https://localhost:4200`), methods, and headers.
6. **Frontend Safeguards**:
   - Route guards: `authGuard` (protects `/profile`), `sellerGuard` (protects `/dashboard`), `loginGuard` (redirects logged-in users).
   - HTTP interceptor: automatically handles expired tokens (`401`) and permission denials (`403`).

---

## Running Frontend Tests

If developing locally:

```bash
cd frontend
npm install
npm test -- --watch=false
npm run build
```
