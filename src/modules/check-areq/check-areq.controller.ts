import { Body, Controller, Post, Res } from '@nestjs/common';
import { CheckAreqService } from './check-areq.service';
import { CheckAreqPostDto } from './dto/checkAreqPost.dto';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('check-areq')
@Controller('check-areq')
export class CheckAreqController {
  constructor(private readonly checkAreqService: CheckAreqService) {}

  @Post()
  checkAreq(@Body() dto: CheckAreqPostDto, @Res() res: Response) {
    const redirectUrl = this.checkAreqService.checkAreq(dto);
    res.redirect(redirectUrl);
  }
}
