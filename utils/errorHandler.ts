/**
 * Error handling and user feedback utilities
 */

export interface AppError {
  code: string;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export class AppErrorHandler {
  /**
   * Handles file upload errors
   */
  static getFileUploadError(error: Error, fileName: string): string {
    if (error.message.includes('canvas')) {
      return `이미지 처리 실패 (${fileName}): 손상된 이미지 파일일 수 있습니다.`;
    }
    if (error.message.includes('blob')) {
      return `이미지 저장 실패: 브라우저 메모리 부족. 사진을 삭제하고 다시 시도하세요.`;
    }
    return `파일 처리 중 오류: ${fileName}`;
  }

  /**
   * Handles backup/restore errors
   */
  static getBackupError(error: Error): string {
    if (error.message.includes('JSON')) {
      return '백업 파일 형식이 잘못되었습니다. 올바른 세이프닥 백업 파일을 선택하세요.';
    }
    if (error instanceof RangeError) {
      return '데이터가 너무 큽니다. 사진을 일부 삭제하고 다시 시도하세요.';
    }
    return '백업 처리 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.';
  }

  /**
   * Handles API errors
   */
  static getApiError(error: any): string {
    if (error?.status === 401 || error?.status === 403) {
      return 'API 키가 유효하지 않습니다. 설정을 확인하세요.';
    }
    if (error?.status === 429) {
      return 'API 호출 제한 초과. 잠시 후 다시 시도하세요.';
    }
    if (error?.status >= 500) {
      return 'Gemini 서버 오류. 잠시 후 다시 시도하세요.';
    }
    return 'AI 보고서 생성 중 오류: 네트워크 연결을 확인하세요.';
  }

  /**
   * Formats error message for user display
   */
  static formatUserMessage(message: string): string {
    return message.charAt(0).toUpperCase() + message.slice(1);
  }

  /**
   * Logs error for debugging (in production, send to logging service)
   */
  static logError(error: Error | AppError, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}]`, error, context);
    
    // In a real application, you would send this to a logging service like Sentry
    // Sentry.captureException(error, { extra: context });
  }
}

/**
 * User feedback messages
 */
export const feedbackMessages = {
  success: {
    dataSaved: '데이터가 자동 저장되었습니다.',
    backupCreated: '백업 파일이 생성되었습니다.',
    dataRestored: '데이터가 성공적으로 복구되었습니다.',
    contentCopied: '내용이 복사되었습니다.',
  },
  warning: {
    unsavedChanges: '저장되지 않은 변경사항이 있습니다.',
    emptyField: '필수 필드를 입력하세요.',
    noData: '저장할 데이터가 없습니다.',
  },
  error: {
    fileUploadFailed: '파일 업로드 실패',
    backupFailed: '백업 생성 실패',
    apiFailed: 'API 호출 실패',
    unexpectedError: '예상치 못한 오류가 발생했습니다.',
  }
};
