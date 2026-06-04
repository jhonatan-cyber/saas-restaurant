import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { CreatePaymentsDto, PreviewChangeDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderId')
  @Roles('OWNER', 'ADMIN', 'CAJERO')
  async pay(
    @Req() req: AuthedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentsDto,
  ) {
    const user = req.user!;
    return this.payments.payOrder({
      businessId: user.businessId,
      userId: user.id,
      orderId,
      dto,
    });
  }

  @Get('orders/:orderId')
  async listForOrder(@Req() req: AuthedRequest, @Param('orderId') orderId: string) {
    const user = req.user!;
    return this.payments.listForOrder({ businessId: user.businessId, orderId });
  }

  @Post('preview-change')
  async previewChange(
    @Query('total') total: string,
    @Body() dto: PreviewChangeDto,
  ) {
    return this.payments.previewChange(total, String(dto.tendered));
  }
}
