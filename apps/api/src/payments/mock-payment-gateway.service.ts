import { Injectable } from '@nestjs/common';
import { PaymentMethod } from './entities/payment.entity';

export interface GatewayChargeRequest {
  merchantReference: string;
  amount: number;
  method: PaymentMethod;
  mockOutcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface GatewayChargeResult {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId: string;
  reason?: string;
}

export interface GatewayRefundRequest {
  merchantReference: string;
  refundKey: string;
  amount: number;
  mockOutcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface GatewayRefundResult {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  refundTransactionId: string;
  reason?: string;
}

interface StoredGatewayTransaction {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId: string;
  amount: number;
  method: PaymentMethod;
  refunds: Map<string, GatewayRefundResult>;
}

@Injectable()
export class MockPaymentGateway {
  // Bộ nhớ lưu trữ trạng thái giao dịch mock tại cổng thanh toán (theo merchantReference)
  private readonly transactions = new Map<string, StoredGatewayTransaction>();

  /**
   * Khởi tạo giao dịch thanh toán qua cổng giả lập
   */
  async charge(req: GatewayChargeRequest): Promise<GatewayChargeResult> {
    // Nếu merchantReference đã tồn tại ở cổng, trả lại kết quả đã ghi nhận (tính lũy thừa ở gateway)
    const existing = this.transactions.get(req.merchantReference);
    if (existing) {
      return {
        status: existing.status,
        transactionId: existing.transactionId,
      };
    }

    const outcome = req.mockOutcome ?? 'SUCCESS';
    const transactionId = `GW-TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const record: StoredGatewayTransaction = {
      status: outcome,
      transactionId,
      amount: req.amount,
      method: req.method,
      refunds: new Map(),
    };
    this.transactions.set(req.merchantReference, record);

    return {
      status: outcome,
      transactionId,
      reason:
        outcome === 'FAILED'
          ? 'Thẻ bị từ chối hoặc số dư tài khoản không đủ.'
          : outcome === 'PENDING'
            ? 'Giao dịch đang chờ xác thực hoặc kết nối quá hạn.'
            : undefined,
    };
  }

  /**
   * Tra cứu trạng thái giao dịch tại cổng thanh toán theo merchantReference (phục vụ đối soát)
   */
  async queryTransaction(merchantReference: string): Promise<GatewayChargeResult | null> {
    const record = this.transactions.get(merchantReference);
    if (!record) {
      return null;
    }
    return {
      status: record.status,
      transactionId: record.transactionId,
    };
  }

  /**
   * Cập nhật trạng thái giao dịch tại mock gateway (dùng cho test hoặc giả lập chuyển đổi trạng thái sau timeout)
   */
  setTransactionStatus(
    merchantReference: string,
    status: 'SUCCESS' | 'FAILED' | 'PENDING',
  ): void {
    const record = this.transactions.get(merchantReference);
    if (record) {
      record.status = status;
    }
  }

  /**
   * Thực hiện hoàn tiền bồi hoàn (Compensation Refund) qua cổng thanh toán theo BR-REFUND-OCC
   */
  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    const record = this.transactions.get(req.merchantReference);
    if (!record) {
      // Nếu không tìm thấy giao dịch gốc ở gateway, từ chối hoàn tiền giả
      return {
        status: 'FAILED',
        refundTransactionId: '',
        reason: 'Không tìm thấy giao dịch gốc tại cổng thanh toán.',
      };
    }

    // Kiểm tra tính lũy thừa của thao tác hoàn tiền dựa trên refundKey
    const existingRefund = record.refunds.get(req.refundKey);
    if (existingRefund) {
      return existingRefund;
    }

    const refundOutcome = req.mockOutcome === 'FAILED' ? 'FAILED' : 'SUCCESS';
    const refundTxId = `GW-REFUND-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const refundRecord: GatewayRefundResult = {
      status: refundOutcome,
      refundTransactionId: refundTxId,
      reason: refundOutcome === 'FAILED' ? 'Cổng thanh toán từ chối hoàn tiền.' : undefined,
    };

    record.refunds.set(req.refundKey, refundRecord);
    return refundRecord;
  }

  /**
   * Xóa sạch trạng thái phục vụ test isolation
   */
  clear(): void {
    this.transactions.clear();
  }
}
