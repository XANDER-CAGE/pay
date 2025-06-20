import { reasonCodes, cardHolderMessages, errorCodeCategories } from '../var/reason-codes.object.var';

export class ErrorCodesValidator {
  
  /**
   * Проверяет, является ли код ошибки безусловно негативным
   * (блокирует повторные попытки для рекуррентных платежей)
   */
  static isUnconditionallyNegative(errorCode: number): boolean {
    return errorCodeCategories.unconditionallyNegative.includes(errorCode);
  }

  /**
   * Проверяет, является ли код ошибки условно негативным
   * (блокировка на 24 часа после 2-х попыток)
   */
  static isConditionallyNegative(errorCode: number): boolean {
    return errorCodeCategories.conditionallyNegative.includes(errorCode);
  }

  /**
   * Проверяет, является ли код ошибки временно негативным
   * (блокировка на 24 часа после 2-х попыток)
   */
  static isTemporarilyNegative(errorCode: number): boolean {
    return errorCodeCategories.temporarilyNegative.includes(errorCode);
  }

  /**
   * Возвращает категорию кода ошибки
   */
  static getErrorCategory(errorCode: number): 'unconditional' | 'conditional' | 'temporary' | 'other' {
    if (this.isUnconditionallyNegative(errorCode)) return 'unconditional';
    if (this.isConditionallyNegative(errorCode)) return 'conditional';
    if (this.isTemporarilyNegative(errorCode)) return 'temporary';
    return 'other';
  }

  /**
   * Проверяет, нужно ли блокировать карту при данном коде ошибки
   */
  static shouldBlockCard(errorCode: number, attemptCount: number): boolean {
    const category = this.getErrorCategory(errorCode);
    
    switch (category) {
      case 'unconditional':
        return true; // Блокируем сразу
      case 'conditional':
      case 'temporary':
        return attemptCount >= 2; // Блокируем после 2-х попыток
      default:
        return false;
    }
  }

  /**
   * Возвращает время блокировки в часах
   */
  static getBlockDurationHours(errorCode: number): number {
    const category = this.getErrorCategory(errorCode);
    
    switch (category) {
      case 'unconditional':
        return Infinity; // Постоянная блокировка
      case 'conditional':
      case 'temporary':
        return 24; // 24 часа
      default:
        return 0;
    }
  }

  /**
   * Получает причину отказа по коду
   */
  static getReasonByCode(errorCode: number): string {
    return reasonCodes[errorCode] || 'Unknown error';
  }

  /**
   * Получает сообщение для плательщика по коду
   */
  static getCardHolderMessage(errorCode: number): string {
    return cardHolderMessages[errorCode] || 'Ошибка обработки платежа';
  }

  /**
   * Проверяет валидность кода ошибки
   */
  static isValidErrorCode(errorCode: number): boolean {
    return errorCode in reasonCodes;
  }

  /**
   * Возвращает все коды ошибок определенной категории
   */
  static getErrorCodesByCategory(category: 'unconditional' | 'conditional' | 'temporary'): number[] {
    switch (category) {
      case 'unconditional':
        return errorCodeCategories.unconditionallyNegative;
      case 'conditional':
        return errorCodeCategories.conditionallyNegative;
      case 'temporary':
        return errorCodeCategories.temporarilyNegative;
      default:
        return [];
    }
  }

  /**
   * Логирует информацию о коде ошибки
   */
  static logErrorInfo(errorCode: number, context?: string): void {
    const isValid = this.isValidErrorCode(errorCode);
    const reason = this.getReasonByCode(errorCode);
    const message = this.getCardHolderMessage(errorCode);
    const category = this.getErrorCategory(errorCode);
    
    console.log(`[ERROR CODE VALIDATION] ${context || 'Payment Error'}:`, {
      code: errorCode,
      valid: isValid,
      reason,
      message,
      category,
      shouldBlock: category !== 'other'
    });
  }

  /**
   * Валидирует справочники на полноту
   */
  static validateHandbooks(): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Проверяем, что для каждого кода ошибки есть сообщение для плательщика
    for (const code in reasonCodes) {
      const errorCode = parseInt(code);
      if (!(errorCode in cardHolderMessages)) {
        issues.push(`Missing card holder message for error code ${errorCode}`);
      }
    }

    // Проверяем, что все коды из категорий существуют в основном справочнике
    const allCategoryCodes = [
      ...errorCodeCategories.unconditionallyNegative,
      ...errorCodeCategories.conditionallyNegative,
      ...errorCodeCategories.temporarilyNegative
    ];

    for (const code of allCategoryCodes) {
      if (!(code in reasonCodes)) {
        issues.push(`Category error code ${code} not found in main handbook`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Возвращает статистику по справочникам
   */
  static getHandbookStats(): {
    totalErrorCodes: number;
    unconditionalCodes: number;
    conditionalCodes: number;
    temporaryCodes: number;
    uncategorizedCodes: number;
  } {
    const totalErrorCodes = Object.keys(reasonCodes).length;
    const unconditionalCodes = errorCodeCategories.unconditionallyNegative.length;
    const conditionalCodes = errorCodeCategories.conditionallyNegative.length;
    const temporaryCodes = errorCodeCategories.temporarilyNegative.length;
    
    const categorizedCodes = new Set([
      ...errorCodeCategories.unconditionallyNegative,
      ...errorCodeCategories.conditionallyNegative,
      ...errorCodeCategories.temporarilyNegative
    ]);
    
    const uncategorizedCodes = Object.keys(reasonCodes)
      .map(Number)
      .filter(code => !categorizedCodes.has(code)).length;

    return {
      totalErrorCodes,
      unconditionalCodes,
      conditionalCodes,
      temporaryCodes,
      uncategorizedCodes
    };
  }
}