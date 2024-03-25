import { Controller, Get, Query, Render } from '@nestjs/common';
import { AcsService } from './acs.service';
import { ApiTags } from '@nestjs/swagger';
import { GetAReqDto } from './dto/getAReq.dto';

@ApiTags('acs')
@Controller('acs')
export class AcsController {
  constructor(private readonly acsService: AcsService) {}

  @Get()
  @Render('acsForm')
  async renderAscForm(@Query() dto: GetAReqDto) {
    const decodedAReq = this.acsService.decodeAReq(dto.aReq);
    const decodeAReqJson = JSON.parse(decodedAReq);
    const decodedPaReq = JSON.parse(
      this.acsService.decodeAReq(decodeAReqJson.PaReq),
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
}
