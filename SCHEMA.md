# Database Schema (OoNt Grocery API)

## Overview

The schema is designed for a grocery inventory and order system with clear separation between catalog (categories, products), user identity, cart state, and orders.

## Entity Relationship Summary

- **User** – One-to-many **Cart** (one cart per user), one-to-many **Order**.
- **Category** – One-to-many **Product** (each product belongs to one category).
- **Product** – Many-to-many with **Cart** via **CartItem** (quantity); many-to-many with **Order** via **OrderItem** (quantity + price snapshot).
- **Cart** – One-to-many **CartItem**; each CartItem references one Product and has a quantity.
- **Order** – One-to-many **OrderItem**; each OrderItem references one Product, with quantity and `priceAtOrder` for historical accuracy.

## Tables

| Table       | Purpose |
|------------|---------|
| User       | Authentication (username/password). Referenced by Cart and Order. |
| Category   | Product grouping (e.g. Dairy, Fruits, Bakery). |
| Product    | Sellable item with price and stock. Soft-deleted via `deletedAt`. |
| Cart       | One per user; persists in Postgres (stateful cart). |
| CartItem   | Cart–Product join with quantity. Unique on (cartId, productId). |
| Order      | Placed order with status (PENDING, CONFIRMED, CANCELLED). |
| OrderItem  | Order–Product join with quantity and `priceAtOrder` (snapshot at order time). |

## Design Decisions

1. **One cart per user** – `Cart.userId` is unique so each user has a single cart.
2. **CartItem unique (cartId, productId)** – Prevents duplicate lines; “add item” becomes upsert of quantity.
3. **OrderItem.priceAtOrder** – Stores price at order time so history remains correct if product price changes.
4. **Product.deletedAt** – Soft delete; products are hidden from listings but past orders still reference them via OrderItem (product not physically deleted).
5. **OrderItem product onDelete: Restrict** – Prevents deleting a product that appears in orders; soft delete is used instead.

## Concurrency

Order creation uses a **Redis-backed job queue** (Bull) with **concurrency 1** so only one order is processed at a time. Within the job, a single **database transaction** with **row-level locking** (`SELECT ... FOR UPDATE` on `Product`) ensures stock is reserved atomically and no oversell occurs.
