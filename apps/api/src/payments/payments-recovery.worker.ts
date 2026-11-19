import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsRecoveryWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentsRecoveryWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private readonly paymentsService: PaymentsService) {}

  async onApplicationBootstrap(): Promise<void> {
    // Kích hoạt đối soát phục hồi ngay sau khi ứng dụng khởi động thành công (bất đồng bộ, không chặn boot)
    setImmediate(() => {
      void this.runRecovery('bootstrap');
    });

    // Cấu hình chu kỳ đối soát định kỳ nếu được kích hoạt
    const intervalMs = Number(process.env.PAYMENTS_RECOVERY_INTERVAL_MS || 30000);
    const isTest = process.env.NODE_ENV === 'test';

    if (intervalMs > 0 && !isTest) {
      this.timer = setInterval(() => {
        void this.runRecovery('interval');
      }, intervalMs);
    }
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Thực thi chu trình đối soát phục hồi giao dịch dở dang (FIX-19)
   */
  async runRecovery(trigger = 'manual'): Promise<{ reconciledCount: number }> {
    if (this.isRunning) {
      return { reconciledCount: 0 };
    }

    this.isRunning = true;
    try {
      const result = await this.paymentsService.reconcilePendingPayments();
      if (result.reconciledCount > 0) {
        this.logger.log(
          `[${trigger}] Đã phục hồi/đối soát thành công ${result.reconciledCount} giao dịch dở dang.`,
        );
      }
      return result;
    } catch (err: unknown) {
      this.logger.error(
        `Lỗi trong tiến trình recovery worker: ${(err as Error).message}`,
      );
      return { reconciledCount: 0 };
    } finally {
      this.isRunning = false;
    }
  }
}
