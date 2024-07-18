import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { MyReq } from 'src/common/interfaces/myReq.interface';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  @ApiBody({ type: CreateOrderDto })
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: MyReq) {
    return this.ordersService.createOrder(createOrderDto, req);
  }

  @Get(':uniqueId')
  @ApiResponse({ status: 200, description: 'Order retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async getOrderById(@Param('uniqueId') uniqueId: string) {
    return this.ordersService.getOrderById(uniqueId);
  }
}
