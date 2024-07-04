import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully.', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Order retrieved successfully.', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }
}
