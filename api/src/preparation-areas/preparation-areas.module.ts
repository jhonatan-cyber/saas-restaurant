import { Module } from '@nestjs/common';
import { PreparationAreasController } from './preparation-areas.controller';
import { PreparationAreasService } from './preparation-areas.service';

@Module({
  controllers: [PreparationAreasController],
  providers: [PreparationAreasService],
  exports: [PreparationAreasService],
})
export class PreparationAreasModule {}
