import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesModule } from '../categories/categories.module';
import { PreparationAreasModule } from '../preparation-areas/preparation-areas.module';

@Module({
  imports: [CategoriesModule, PreparationAreasModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
