import { Body, Controller, Post } from '@nestjs/common';
import { DecryptService } from './decrypt.service';
import { DecrypPostDto } from './dto/decryptPost.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Decrypt')
@Controller('decrypt')
export class DecryptController {
  constructor(private readonly decryptService: DecryptService) {}

  @Post()
  create(@Body() dto: DecrypPostDto) {
    try {
      const decryptedData = this.decryptService.decryptData(dto.encryptedData);
      return { success: true, decryptedData };
    } catch (error) {
      const data = JSON.stringify({
        success: false,
        message: error.message,
      });
      throw new Error(data);
    }
  }
}
