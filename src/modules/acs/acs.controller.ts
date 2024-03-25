import { Controller, Get, Query, Res } from '@nestjs/common';
import { AcsService } from './acs.service';
import { ApiTags } from '@nestjs/swagger';
import { GetAReqDto } from './dto/getAReq.dto';
import { Response } from 'express';

@ApiTags('acs')
@Controller('acs')
export class AcsController {
  constructor(private readonly acsService: AcsService) {}

  @Get()
  async renderAscForm(@Query() dto: GetAReqDto, @Res() res: Response) {
    const decodedAReq = this.acsService.decodeAReq(dto.aReq);
    const decodeAReqJson = JSON.parse(decodedAReq);
    const decodedPaReq = JSON.parse(
      this.acsService.decodeAReq(decodeAReqJson.PaReq),
    );
    res.render('acsForm', {
      title: 'Введите код из SMS',
      otpId: decodedPaReq.id,
      amount: decodedPaReq.Amount,
      description: decodedPaReq.Description,
      md: decodeAReqJson.MD,
      TermUrl: decodeAReqJson.TermUrl,
      phone: decodedPaReq.phone,
    });
  }
}
