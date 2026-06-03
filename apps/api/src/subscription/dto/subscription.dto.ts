import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignPlanDto {
  @ApiProperty({ description: 'ID del plan a asignar' })
  @IsString()
  planId!: string;
}
