import { Injectable } from '@nestjs/common';
import { CheckAreqPostDto } from './dto/checkAreqPost.dto';

@Injectable()
export class CheckAreqService {
  checkAreq(dto: CheckAreqPostDto) {
    try {
      const encodedData = Buffer.from(JSON.stringify(dto)).toString('base64');
      return `https://pay.dnsc.uz/acs?AReq=${encodeURIComponent(encodedData)}`;
    } catch (error) {
      console.error('Ошибка при отправке AReq: ', error.message);
      throw new Error('Ошибка при отправке AReq');
    }
  }
}
