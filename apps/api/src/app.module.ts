import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { CategoriesModule } from './categories/categories.module';
import { PreparationAreasModule } from './preparation-areas/preparation-areas.module';
import { ProductsModule } from './products/products.module';
import { TablesModule } from './tables/tables.module';
import { CustomersModule } from './customers/customers.module';

/**
 * Módulo raíz del API.
 * Importa:
 *  - ConfigModule (global, carga .env)
 *  - PrismaModule (global, expone PrismaService)
 *  - AuditModule (global, expone AuditService)
 *  - AuthModule (login, refresh, me)
 *  - UsersModule (servicio de usuarios usado por Auth)
 *  - CategoriesModule, PreparationAreasModule, ProductsModule (catálogo)
 *  - TablesModule (mesas)
 *  - CustomersModule (clientes)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    PreparationAreasModule,
    ProductsModule,
    TablesModule,
    CustomersModule,
  ],
})
export class AppModule {}
