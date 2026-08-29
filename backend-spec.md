# DineHub Backend Specifications

This document outlines the backend structure, stack, and API schema for DineHub. You can share this document (or its contents) in your frontend project workspace to give the AI context about how to connect to the backend via Server-Side Rendering (SSR) and API calls.

## Tech Stack
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma Client
- **Authentication**: Better Auth (via `auth.service.ts` using JWT/Session cookies)
- **Validation**: `class-validator` and `class-transformer` (built-in validation pipes in NestJS)

## Modules & Endpoints Overview

The backend is modularized with the following key resources. All endpoints are generally prefixed with `/api` or the specific controller route depending on `main.ts` config:

1. **Auth** (`/auth`)
   - Handles login, signup, and session validation.
   - Roles: `admin`, `cashier`.
   - Better Auth integration maps to `user`, `session`, `account`, and `verification` tables.

2. **Branches** (`/branches`)
   - The core multi-tenant entity. Most resources belong to a specific branch (`branchId`).
   - Create, read, update, delete branches.

3. **Tables** (`/tables`)
   - Tables assigned to branches (e.g., Table 1, Table 2).
   - Used for dine-in orders.

4. **Categories & Menu** (`/categories`, `/menu`)
   - **Categories**: Group products (e.g., "Main Course", "Drinks"). Supports English (`nameEn`) and Arabic (`nameAr`) names, plus sorting (`sortOrder`).
   - **Products**: Items within a category. Includes price, dual-language names/descriptions, image URL, and availability toggle.
   - **Attributes**: Features/options that can be attached to products (via `ProductAttribute`).

5. **Orders** (`/orders`)
   - Connects a `Branch`, a `Table`, and a list of `OrderItem`s.
   - **Status Flow**: `pending` -> `preparing` -> `ready` -> `delivered`.
   - Stores `priceAtOrder` in `OrderItem` to keep historical pricing.

## Database Schema Highlights (Prisma)

Here is the core entity relationship:

- **Branch**: 1-to-Many with Tables, Categories, Orders, Users, Attributes.
- **Table**: Belongs to a Branch. Unique constraint on `[branchId, number]`.
- **Category**: Belongs to a Branch. 1-to-Many with Products.
- **Product**: Belongs to a Category. Many-to-Many with Attributes (via `ProductAttribute`).
- **Order**: Belongs to a Branch and a Table. 1-to-Many with OrderItems.
- **User/Session**: Better Auth schema injected into Prisma, includes `branchId` and `role` (`admin` or `cashier`).

## Frontend Integration Notes (SSR / React)

When building the frontend:
- **Authentication**: Use Better Auth client-side SDK or make direct requests to the auth endpoints. SSR requires passing the session cookie in the initial request headers to the backend.
- **Data Fetching**: The frontend can use React Server Components (RSC) to fetch data from the NestJS backend on the server side, ensuring fast loads and good SEO.
- **Language Support**: Send an `Accept-Language` header or a locale query parameter if needed, but the database stores both `ar` and `en` fields (e.g., `nameAr`, `nameEn`) allowing the frontend to easily map them based on the active locale.

---
**How to use this context:** 
Keep this file in your workspace, or simply use `@` in the chat to mention this specific conversation when you open your frontend project.
