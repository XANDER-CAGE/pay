import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ReceiptRequest } from './dto/receipe-dto';

@Injectable()
export class ZplatFiscalizationService {
  private readonly fiscalizationUrl: string;
  private readonly fiscalizationLogin: string;
  private readonly fiscalizationPass: string;

  constructor() {
    this.fiscalizationLogin = process.env.OFD_LOGIN;
    this.fiscalizationPass = process.env.OFD_PASS;
    this.fiscalizationUrl = process.env.OFD_URL;
  }

  async fiscalizeReceipt(receiptRequest: ReceiptRequest): Promise<any> {
    try {
      const requestPayload = this.mapReceiptRequestToApiPayload(receiptRequest);
      const response = await axios.post(this.fiscalizationUrl, requestPayload, {
        auth: {
          username: this.fiscalizationLogin,
          password: this.fiscalizationPass,
        },
      });

      return this.handleFiscalizationResponse(response.data);
    } catch (error) {
      return this.handleFiscalizationError(error);
    }
  }

  private mapReceiptRequestToApiPayload(receiptRequest: ReceiptRequest): any {
    const items = receiptRequest.CustomerReceipt.Items.map((item) => ({
      ikpu_name: item.Label,
      ikpu: '11201001001000000',
      package_code: '1500729',
      inn: receiptRequest.Inn,
      count: parseFloat(item.Quantity),
      nds: item.Vat,
      amount: parseFloat(item.Amount) * 100,
    }));

    return {
      jsonrpc: '2.0',
      method: 'ofd.register',
      id: Date.now(),
      params: {
        receipt_type: 0,
        receipt_id: receiptRequest.InvoiceId || `receipt_${Date.now()}`,
        items,
      },
    };
  }

  private handleFiscalizationResponse(apiResponse: any): any {
    if (!apiResponse.result) {
      throw new Error('Invalid fiscalization response');
    }

    return {
      Model: {
        Id: apiResponse.result.result.receipt_id,
        ErrorCode: 0,
      },
      InnerResult: null,
      Success: true,
      Message: 'Queued',
      Warning:
        apiResponse.result.result.message === 'accepted'
          ? null
          : apiResponse.result.result.message,
    };
  }

  private handleFiscalizationError(error: any): any {
    let errorCode = -1;
    let errorMessage = 'Fiscalization request failed';

    if (error.response) {
      errorCode = error.response.data?.error?.code || -1;
      errorMessage = error.response.data?.error?.message || errorMessage;
    } else if (error.request) {
      errorMessage = 'No response received from the fiscalization API';
    }

    return {
      Model: {
        ErrorCode: errorCode,
      },
      InnerResult: null,
      Success: false,
      Message: errorMessage,
      Warning: null,
    };
  }
}
