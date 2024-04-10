import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SendSmsWithPlayMobile {
  private message: string;
  private messageId: number;
  private phone: string;
  private username: string;
  private password: string;
  private endpoint: string;
  private originator: string;
  constructor() {
    this.messageId = Math.floor(Math.random() * 900000000) + 100000000;
    this.username = process.env.PLAYMOBILE_USERNAME;
    this.password = process.env.PLAYMOBILE_PASSWORD;
    this.endpoint = process.env.PLAYMOBILE_ENDPOINT;
    this.originator = process.env.PLAYMOBILE_ORIGINATOR;
  }

  async send(phone: string, message: string) {
    this.message = message;
    this.phone = phone.split('+').join('');
    const validationResult = this.customValidation();
    if (validationResult.status !== 200) {
      return validationResult;
    }

    const clnMessage = this.cleanMessage(this.message);
    const sendResult = await this.sendMessage(clnMessage);
    return sendResult;
  }

  private customValidation() {
    if (String(this.phone).length !== 12) {
      return { status: 400, result: 'Ошибка при вводе, номера телефона!' };
    }
    if (!this.message || this.message.trim() === '') {
      return { status: 400, result: 'Текст сообщения обязателен' };
    }
    return { status: 200, result: null };
  }

  private async sendMessage(message: string) {
    const url = this.endpoint;
    try {
      const headers = { 'Content-Type': 'application/json' };
      const payload = {
        messages: [
          {
            recipient: this.phone,
            'message-id': this.messageId,
            sms: {
              originator: this.originator,
              content: {
                text: message,
              },
            },
          },
        ],
      };
      const response = await axios.post(url, payload, {
        headers: headers,
        auth: {
          username: this.username,
          password: this.password,
        },
      });
      if (response.status !== 200) {
        throw new Error('Смс шлюз не доступен');
      }
      return { status: 200, result: 'Смс успешно отправлено' };
    } catch (error) {
      const errMsg = `Ошибка в playmobile: ${error.message || error.response.data.message}`;
      console.error(error.message);
      throw new Error(errMsg);
    }
  }

  private cleanMessage(message) {
    // Implement the same message cleaning logic as in Python code
    return message; // Replace this with actual cleaning logic
  }
}

// Пример использования
// const phone = "+998919979967";
// const playmobileApi = new SendSmsWithPlayMobile(phone);
// playmobileApi.send().then(response => {
//     console.log(response);
// }).catch(error => {
//     console.error(error);
// });
