import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import type { CreateCashMovementDto, CashMovementFiltersDto } from './dto/cash-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Request } from 'express';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';

interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
  businessContext?: BusinessContext;
}

@Controller('cash-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashMovementsController {
  constructor(private readonly movements: CashMovementsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'CAJERO')
  async create(@Req() req: AuthedRequest, @Body() dto: CreateCashMovementDto) {
    const user = req.user!;
    this.ensureBranchAccess(user, dto.branchId);
    return this.movements.create({
      businessId: user.businessId,
      userId: user.id,
      dto,
    });
  }

  @Get()
  async list(@Req() req: AuthedRequest, @Query() filters: CashMovementFiltersDto) {
    const user = req.user!;
    if (filters.branchId) this.ensureBranchAccess(user, filters.branchId);
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    return this.movements.list({
      businessId: user.businessId,
      branchId: filters.branchId,
      shiftId: filters.shiftId,
      type: filters.type,
      category: filters.category,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      page,
      pageSize,
    });
  }

  @Get('summary')
  async summary(
    @Req() req: AuthedRequest,
    @Query('branchId') branchId: string,
    @Query('shiftId') shiftId?: string,
  ) {
    const user = req.user!;
    this.ensureBranchAccess(user, branchId);
    return this.movements.getSummary({ businessId: user.businessId, branchId, shiftId });
  }

  private ensureBranchAccess(user: AuthenticatedUser, branchId: string | undefined): void {
    if (!branchId) return;
    if (user.branchIds.length > 0 && !user.branchIds.includes(branchId)) {
      throw new ForbiddenException('No tenés acceso a esta sucursal');
    }
  }
}
