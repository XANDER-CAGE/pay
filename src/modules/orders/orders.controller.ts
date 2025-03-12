import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { MyReq } from 'src/common/interfaces/myReq.interface';
import { CancelOrderDto } from './dto/cancell-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  @ApiBody({ type: CreateOrderDto })
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Order created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: MyReq) {
    return this.ordersService.createOrder(createOrderDto, req);
  }

  @Post('cancel')
  @ApiBody({ type: CreateOrderDto })
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Order created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  async cancelOrder(@Body() cancelOrderDto: CancelOrderDto) {
    return this.ordersService.cancelOrder(cancelOrderDto.Id);
  }

  @Get(':uniqueId')
  @ApiResponse({ status: 200, description: 'Order retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async getOrderById(@Param('uniqueId') uniqueId: string) {
    return this.ordersService.getOrderById(uniqueId);
  }
}
