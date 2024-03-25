import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { BinsService } from './bins.service';
import { CreateBinDto } from './dto/create-bin.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Bins')
@Controller('bins')
export class BinsController {
  constructor(private readonly binsService: BinsService) {}

  @Post('/add-or-update')
  create(@Body() createBinDto: CreateBinDto) {
    return this.binsService.create(createBinDto);
  }

  @Get('bins/info/:bin')
  async findOne(@Param('bin') bin: string) {
    const binInfo = await this.binsService.findOne(bin);
    if (!binInfo) {
      throw new NotFoundException('BIN not found');
    }
    return { Model: binInfo, Success: true, Message: null };
  }
}
