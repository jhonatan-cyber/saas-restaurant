-- init.sql — Creación inicial de la base de datos (alternativa a auto-create)
-- Normalmente Prisma migrate deploy crea las tablas automáticamente.
-- Este script solo crea la BD si usás un esquema donde el usuario no tiene
-- permisos de CREATE DATABASE.

CREATE DATABASE IF NOT EXISTS saas_restaurant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
