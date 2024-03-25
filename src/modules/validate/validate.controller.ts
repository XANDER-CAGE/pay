import { Body, Controller, Post, Render } from '@nestjs/common';
import { ValidateService } from './validate.service';
import { ValidateDto } from './dto/validate.dto';

@Controller('validate')
export class ValidateController {
  constructor(private readonly validateService: ValidateService) {}

  @Post()
  @Render('form')
  async validate(@Body() dto: ValidateDto) {
    await this.validateService.validate(dto);
    const paResData = {
      IsCancelled: false,
      ExpiryDate: '2024-03-13T23:37:37.531375Z',
      AuthorizationDataId: '65eae845d71cf55202cbf724',
      SessionId: 'b05584fd-a7fd-4805-b760-8db0411b4c20',
    };
    const paResBase64 = Buffer.from(JSON.stringify(paResData)).toString(
      'base64',
    );
    try {
      return {
        PaRes: paResBase64,
        md: dto.md,
        TermUrl: dto.TermUrl,
      };
    } catch (error) {
      console.error(
        'Ошибка при отправке POST-запроса на TermUrl:',
        error.message,
      );
      throw new Error('Ошибка при отправке POST-запроса на TermUrl');
    }
  }
}
