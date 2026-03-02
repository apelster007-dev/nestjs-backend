# OoNt Grocery Inventory & Order API

NestJS backend for product catalog, cart, and order processing with PostgreSQL and Redis.

## Running with Docker

**Prerequisites:** Docker and Docker Compose installed.

### Build and start

```bash
docker compose build
docker compose up -d
```

- **API:** http://localhost:3000  
- **Swagger:** http://localhost:3000/api  

Migrations run automatically when the app container starts.

### Seed the database

After the stack is running (once per environment):

```bash
docker compose exec app npx prisma db seed
```

### Run migrations only (one-off)

```bash
docker compose run --rm app npx prisma migrate deploy
```

### Run tests

```bash
docker compose run --rm app npm test
```

### Stop the stack

```bash
docker compose down
```

### Stop and remove volumes (full reset)

```bash
docker compose down -v
```

### Environment

| Variable       | Description                    | Default (Docker) |
|----------------|--------------------------------|------------------|
| DATABASE_URL   | PostgreSQL connection string  | postgresql://oont:oont@db:5432/oont |
| REDIS_HOST     | Redis host for Bull queue      | redis            |
| REDIS_PORT     | Redis port                     | 6379             |
| JWT_SECRET     | Secret for JWT signing         | (set in production) |
| PORT           | HTTP port                      | 3000             |

## API Overview

- **Public (no auth):** `GET /products`, `GET /products/:id`, `GET /categories`, `GET /categories/:id/products`
- **Auth:** `POST /auth/register`, `POST /auth/login` (body: `username`, `password`). Use the returned `access_token` as **Bearer token** for protected routes.
- **Cart (Bearer token):** `GET /cart`, `POST /cart/items`, `PUT /cart/items/:productId`, `DELETE /cart/items/:productId`, `DELETE /cart` — user is inferred from the JWT; no userId in path or body.
- **Orders (Bearer token):** `POST /orders` (no body), `GET /orders/:id`, `POST /orders/:id/cancel` — user is inferred from the JWT; create/view/cancel only your own orders.

## Concurrency Strategy (No Overselling)

We use two layers:

1. **Redis message queue (Bull)**  
   Every `POST /orders` request enqueues a single “create order” job. The order queue worker runs with **concurrency 1**, so only one order is processed at a time. This serializes order creation at the application level and avoids multiple requests updating the same stock in parallel.

2. **Database transaction + row-level locking**  
   Inside the worker, each order is processed in a single PostgreSQL transaction. Before changing stock, we lock the affected product rows with `SELECT ... FOR UPDATE`. So even if multiple workers were used in the future, the database would still prevent overselling by locking rows until the transaction commits.

Together, the queue ensures orders are handled one-by-one, and the transaction with `FOR UPDATE` guarantees atomic stock reservation and consistent reads.

## Design Notes

- **Modular structure:** `ProductModule`, `CategoryModule`, `CartModule`, `OrderModule`, `AuthModule`, `PrismaModule`.
- **Validation:** DTOs use `class-validator` and `class-transformer`; global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`.
- **Soft deletes:** Products use `deletedAt`. Deleted products are excluded from catalog and categories but remain visible in past orders.
- **Schema:** See `SCHEMA.md` for entity relationships and design choices.

## Scripts

| Command           | Description                |
|-------------------|----------------------------|
| `npm run start:dev` | Start with watch          |
| `npm run build`    | Build for production      |
| `npm run prisma:seed` | Seed categories, products, demo user |
| `npm run test`      | Unit tests                |
| `npm run test:e2e`  | E2E tests                 |

## Demo User (after seed)

- Username: `demo`  
- Password: `password123`  

Use `POST /auth/login` to get an `access_token`, then send it as `Authorization: Bearer <token>` on cart and order requests. The server reads the user from the token; you never send userId in the request.
