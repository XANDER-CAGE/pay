import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Render,
  Res,
} from '@nestjs/common';
import { HomeService } from './home.service';
import { ApiTags } from '@nestjs/swagger';
import { CheckAreqPostDto } from 'src/modules/home/dto/checkAreqPost.dto';
import { Response } from 'express';
import { ValidateDto } from 'src/modules/home/dto/validate.dto';
import { GetAReqDto } from './dto/getAReq.dto';

@ApiTags('Home')
@Controller('')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('acs')
  @Render('acsForm')
  async renderAscForm(@Query() dto: GetAReqDto) {
    const decodedAReq = Buffer.from(dto.AReq, 'base64').toString('utf-8');
    const decodeAReqJson = JSON.parse(decodedAReq);
    const decodedPaReq = JSON.parse(
      Buffer.from(decodeAReqJson.PaReq, 'base64').toString('utf-8'),
    );
    return {
      title: 'Введите код из SMS',
      otpId: decodedPaReq.id,
      amount: decodedPaReq.Amount,
      description: decodedPaReq.Description,
      md: decodeAReqJson.MD,
      TermUrl: decodeAReqJson.TermUrl,
      phone: decodedPaReq.phone,
    };
  }

  @Post('check_areq')
  checkAreq(@Body() dto: CheckAreqPostDto, @Res() res: Response) {
    const encodedData = Buffer.from(JSON.stringify(dto)).toString('base64');
    const redirectUrl = `https://pay.dnsc.uz/acs?AReq=${encodeURIComponent(
      encodedData,
    )}`;
    res.redirect(redirectUrl);
  }

  @Post('validate')
  @Render('form')
  async validate(@Body() dto: ValidateDto) {
    await this.homeService.validate(dto);
    const paResData = {
      IsCancelled: false,
      ExpiryDate: '2024-03-13T23:37:37.531375Z',
      AuthorizationDataId: '65eae845d71cf55202cbf724',
      SessionId: 'b05584fd-a7fd-4805-b760-8db0411b4c20',
    };
    const paResBase64 = Buffer.from(JSON.stringify(paResData)).toString('base64');
  
    try {
      let md = dto.md;
      if (dto.TermUrl === 'https://widget.gpay.uz/3ds-callback') {
        md = JSON.stringify({
          SuccessUrl: 'https://widget.gpay.uz/app/result.html?Success',
          FailUrl: 'https://widget.cloudpayments.ru/app/result.html?Fail',
          TransactionId: dto.md,
        });
      }
  
      return {
        PaRes: paResBase64,
        md: md,
        TermUrl: dto.TermUrl,
      };
    } catch (error) {
      console.error('Ошибка при отправке POST-запроса на TermUrl:', error.message);
      throw new Error('Ошибка при отправке POST-запроса на TermUrl');
    }
  }
}
