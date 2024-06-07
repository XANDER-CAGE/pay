import { Body, Controller, Post } from '@nestjs/common';
import { DecryptService } from './decrypt.service';
import { DecrypPostDto } from './dto/decryptPost.dto';
import { ApiTags } from '@nestjs/swagger';
import { CoreApiResponse } from 'src/common/classes/model.class';

@ApiTags('Decrypt')
@Controller('decrypt')
export class DecryptController {
  constructor(private readonly decryptService: DecryptService) {}

  @Post()
  create(@Body() dto: DecrypPostDto) {
    const { success, decryptedData } = this.decryptService.decryptData(
      dto.encryptedData,
    );
    if (!success) {
      return CoreApiResponse.wrongCryptogram();
    }
    return { success, decryptedData };
  }
}
