import { Injectable, HttpService } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  constructor(private readonly httpService: HttpService) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    const response = await firstValueFrom(
      this.httpService.post('https://orders.gpay.uz', createOrderDto),
    );
    return response.data;
  }
}
