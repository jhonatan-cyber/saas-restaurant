import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { CashService } from './cash.service';
import type {
  OpenShiftDto,
  CloseShiftDto,
  CreateCashRegisterDto,
  CashFiltersDto,
} from './dto/cash.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Request } from 'express';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';

interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
  businessContext?: BusinessContext;
}

@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashController {
  constructor(private readonly cash: CashService) {}

  // ============== Cash Registers ==============

  @Get('registers')
  async listRegisters(@Req() req: AuthedRequest, @Query('branchId') branchId?: string) {
    const user = req.user!;
    this.ensureBranchAccess(user, branchId);
    return this.cash.listCashRegisters({ businessId: user.businessId, branchId });
  }

  @Post('registers')
  @Roles('OWNER', 'ADMIN')
  async createRegister(
    @Req() req: AuthedRequest,
    @Body() dto: CreateCashRegisterDto,
  ) {
    const user = req.user!;
    this.ensureBranchAccess(user, dto.branchId);
    return this.cash.createCashRegister({
      businessId: user.businessId,
      branchId: dto.branchId,
      code: dto.code,
      userId: user.id,
    });
  }

  // ============== Shifts ==============

  @Get('shifts/current')
  async getCurrentShift(@Req() req: AuthedRequest, @Query('branchId') branchId?: string) {
    const user = req.user!;
    const targetBranch = branchId ?? user.defaultBranchId;
    if (!targetBranch) {
      return { shift: null };
    }
    this.ensureBranchAccess(user, targetBranch);
    const shift = await this.cash.getOpenShift({
      businessId: user.businessId,
      userId: user.id,
      branchId: targetBranch,
    });
    return { shift };
  }

  @Post('shifts/open')
  @Roles('OWNER', 'ADMIN', 'CAJERO')
  async openShift(@Req() req: AuthedRequest, @Body() dto: OpenShiftDto) {
    const user = req.user!;
    // Resolver branchId del cash register (más seguro que confiar en el body)
    const branchId = user.defaultBranchId;
    if (!branchId) {
      throw new ForbiddenException('El usuario no tiene branchId asignado');
    }
    this.ensureBranchAccess(user, branchId);
    return this.cash.openShift({
      businessId: user.businessId,
      branchId,
      cashRegisterId: dto.cashRegisterId,
      userId: user.id,
      openingAmount: dto.openingAmount,
    });
  }

  @Post('shifts/:id/close')
  @Roles('OWNER', 'ADMIN', 'CAJERO')
  async closeShift(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
  ) {
    const user = req.user!;
    return this.cash.closeShift({
      businessId: user.businessId,
      shiftId: id,
      userId: user.id,
      closingAmount: dto.closingAmount,
      closingNotes: dto.closingNotes,
    });
  }

  @Get('shifts/:id/arqueo')
  async arqueo(@Req() req: AuthedRequest, @Param('id') id: string) {
    const user = req.user!;
    return this.cash.computeArqueo({ businessId: user.businessId, shiftId: id });
  }

  @Get('shifts')
  async listShifts(@Req() req: AuthedRequest, @Query() filters: CashFiltersDto) {
    const user = req.user!;
    if (filters.branchId) this.ensureBranchAccess(user, filters.branchId);
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    return this.cash.listShifts({
      businessId: user.businessId,
      branchId: filters.branchId,
      userId: filters.userId,
      status: filters.status,
      page,
      pageSize,
    });
  }

  // ============== Helpers ==============

  private ensureBranchAccess(user: AuthenticatedUser, branchId: string | undefined): void {
    if (!branchId) return;
    if (user.branchIds.length > 0 && !user.branchIds.includes(branchId)) {
      throw new ForbiddenException('No tenés acceso a esta sucursal');
    }
  }
}
