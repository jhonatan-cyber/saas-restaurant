import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { CategoriesModule } from './categories/categories.module';
import { PreparationAreasModule } from './preparation-areas/preparation-areas.module';
import { ProductsModule } from './products/products.module';
import { TablesModule } from './tables/tables.module';
import { CustomersModule } from './customers/customers.module';
import { CashFoundationModule } from './cash-foundation/cash-foundation.module';
import { CashModule } from './cash/cash.module';
import { CashMovementsModule } from './cash-movements/cash-movements.module';
import { PaymentsModule } from './payments/payments.module';
import { BranchesModule } from './branches/branches.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';
import { PosStationsModule } from './pos-stations/pos-stations.module';
import { OrdersModule } from './orders/orders.module';
import { RealtimeModule } from './realtime/realtime.module';
import { CacheModule } from './cache/cache.module';
import { BusinessModule } from './business/business.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { BillingModule } from './billing/billing.module';
import { PrintModule } from './print/print.module';

/**
 * Módulo raíz del API.
 * Importa:
 *  - ConfigModule (global, carga .env)
 *  - PrismaModule (global, expone PrismaService)
 *  - AuditModule (global, expone AuditService)
 *  - RealtimeModule (global, expone RealtimeGateway para emitir eventos WS)
 *  - AuthModule (login, refresh, me)
 *  - UsersModule (servicio de usuarios usado por Auth)
 *  - CategoriesModule, PreparationAreasModule, ProductsModule (catálogo)
 *  - TablesModule (mesas)
 *  - CustomersModule (clientes)
 *  - CashFoundationModule (F3: read-only; F4 lo extiende con CashModule)
 *  - CashModule (F4: CRUD completo de caja y turnos)
 *  - CashMovementsModule (F4: egresos/ingresos)
 *  - PaymentsModule (F4: pagos, mixto, efectivo/QR/transfer)
 *  - BranchesModule (CRUD de sucursales)
 *  - PosStationsModule (F5: activación de estaciones POS)
 *  - OrdersModule (F3: motor de venta, integrado con Payments en F4)
 *  - BusinessModule (F7: configuración del negocio)
 *  - PlansModule (F7: CRUD de planes, SUPER_ADMIN)
 *  - SubscriptionModule (F7: asignar/cancelar plan)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          autoLogging: true,
          transport:
            config.get<string>('NODE_ENV') === 'production' || config.get<string>('NODE_ENV') === 'test'
              ? undefined
              : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
          serializers: {
            req: (req) => ({ method: req.method, url: req.url }),
            res: (res) => ({ statusCode: res.statusCode }),
          },
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule,
    PrismaModule,
    AuditModule,
    RealtimeModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    PreparationAreasModule,
    ProductsModule,
    TablesModule,
    CustomersModule,
    CashFoundationModule,
    CashModule,
    CashMovementsModule,
    PaymentsModule,
    BranchesModule,
    SuppliersModule,
    PurchasesModule,
    InventoryModule,
    ReportsModule,
    PosStationsModule,
    OrdersModule,
    BusinessModule,
    PlansModule,
    SubscriptionModule,
    BillingModule,
    PrintModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
