import * as fs from 'fs';
import * as path from 'path';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
  reason?: string;
  refunds: Record<string, GatewayRefundResult>;
}

interface PersistentGatewayState {
  transactions: Record<string, StoredGatewayTransaction>;
}

@Injectable()
export class MockPaymentGateway {
  private readonly storeFilePath: string;
  private inMemoryCache: Record<string, StoredGatewayTransaction> = {};

  constructor(
    @Optional()
    @Inject(DataSource)
    private readonly dataSource?: DataSource,
  ) {
    this.storeFilePath =
      process.env.MOCK_GATEWAY_STORE_FILE ||
      path.resolve(process.cwd(), '.mock-gateway-state.json');
    this.loadStateFromFile();
  }

  private loadStateFromFile(): void {
    try {
      if (fs.existsSync(this.storeFilePath)) {
        const raw = fs.readFileSync(this.storeFilePath, 'utf8');
        const parsed = JSON.parse(raw) as PersistentGatewayState;
        this.inMemoryCache = parsed.transactions || {};
      }
    } catch {
      this.inMemoryCache = {};
    }
  }

  private persistStateToFile(): void {
    try {
      const state: PersistentGatewayState = {
        transactions: this.inMemoryCache,
      };
      fs.writeFileSync(this.storeFilePath, JSON.stringify(state, null, 2), 'utf8');
    } catch {
      // Ignored if file write fails in constrained environments
    }
  }

  /**
   * Đảm bảo các bảng mock gateway tồn tại trong PostgreSQL nếu kết nối sẵn sàng (FIX-15)
   */
  public async ensureTables(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "mock_gateway_transactions" (
          "id" SERIAL PRIMARY KEY,
          "merchantReference" varchar(100) UNIQUE NOT NULL,
          "transactionId" varchar(100) NOT NULL,
          "status" varchar(30) NOT NULL,
          "amount" numeric(12, 2) NOT NULL,
          "method" varchar(30) NOT NULL,
          "reason" text,
          "createdAt" timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "mock_gateway_refunds" (
          "id" SERIAL PRIMARY KEY,
          "merchantReference" varchar(100) NOT NULL,
          "refundKey" varchar(128) UNIQUE NOT NULL,
          "refundTransactionId" varchar(100) NOT NULL,
          "status" varchar(30) NOT NULL,
          "amount" numeric(12, 2) NOT NULL,
          "reason" text,
          "createdAt" timestamp NOT NULL DEFAULT now()
        );
      `);
    }
  }

  /**
   * Khởi tạo giao dịch thanh toán qua cổng giả lập bền vững (FIX-15)
   */
  async charge(req: GatewayChargeRequest): Promise<GatewayChargeResult> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.ensureTables();

      const existingRows = await this.dataSource.query(
        `SELECT * FROM "mock_gateway_transactions" WHERE "merchantReference" = $1`,
        [req.merchantReference],
      );

      if (existingRows.length > 0) {
        return {
          status: existingRows[0].status,
          transactionId: existingRows[0].transactionId,
          reason: existingRows[0].reason || undefined,
        };
      }

      const outcome = req.mockOutcome ?? 'SUCCESS';
      const transactionId = `GW-TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const reason =
        outcome === 'FAILED'
          ? 'Thẻ bị từ chối hoặc số dư tài khoản không đủ.'
          : outcome === 'PENDING'
            ? 'Giao dịch đang chờ xác thực hoặc kết nối quá hạn.'
            : null;

      try {
        await this.dataSource.query(
          `INSERT INTO "mock_gateway_transactions" ("merchantReference", "transactionId", "status", "amount", "method", "reason")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT ("merchantReference") DO UPDATE SET "merchantReference" = EXCLUDED."merchantReference"`,
          [req.merchantReference, transactionId, outcome, req.amount, req.method, reason],
        );
      } catch {
        // Race condition: another worker inserted same merchantReference
      }

      const canonical = await this.dataSource.query(
        `SELECT * FROM "mock_gateway_transactions" WHERE "merchantReference" = $1`,
        [req.merchantReference],
      );

      return {
        status: canonical[0].status,
        transactionId: canonical[0].transactionId,
        reason: canonical[0].reason || undefined,
      };
    }

    // Fallback lưu trữ file & bộ nhớ khi không có PostgreSQL
    this.loadStateFromFile();
    const existing = this.inMemoryCache[req.merchantReference];
    if (existing) {
      return {
        status: existing.status,
        transactionId: existing.transactionId,
        reason: existing.reason,
      };
    }

    const outcome = req.mockOutcome ?? 'SUCCESS';
    const transactionId = `GW-TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const reason =
      outcome === 'FAILED'
        ? 'Thẻ bị từ chối hoặc số dư tài khoản không đủ.'
        : outcome === 'PENDING'
          ? 'Giao dịch đang chờ xác thực hoặc kết nối quá hạn.'
          : undefined;

    this.inMemoryCache[req.merchantReference] = {
      status: outcome,
      transactionId,
      amount: req.amount,
      method: req.method,
      reason,
      refunds: {},
    };
    this.persistStateToFile();

    return {
      status: outcome,
      transactionId,
      reason,
    };
  }

  /**
   * Tra cứu trạng thái giao dịch tại cổng thanh toán theo merchantReference (phục vụ đối soát)
   */
  async queryTransaction(merchantReference: string): Promise<GatewayChargeResult | null> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.ensureTables();
      const rows = await this.dataSource.query(
        `SELECT * FROM "mock_gateway_transactions" WHERE "merchantReference" = $1`,
        [merchantReference],
      );
      if (rows.length > 0) {
        return {
          status: rows[0].status,
          transactionId: rows[0].transactionId,
          reason: rows[0].reason || undefined,
        };
      }
      return null;
    }

    this.loadStateFromFile();
    const record = this.inMemoryCache[merchantReference];
    if (!record) {
      return null;
    }
    return {
      status: record.status,
      transactionId: record.transactionId,
      reason: record.reason,
    };
  }

  /**
   * Cập nhật trạng thái giao dịch tại mock gateway (dùng cho test hoặc giả lập chuyển đổi trạng thái sau timeout)
   */
  async setTransactionStatus(
    merchantReference: string,
    status: 'SUCCESS' | 'FAILED' | 'PENDING',
  ): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.ensureTables();
      await this.dataSource.query(
        `UPDATE "mock_gateway_transactions" SET "status" = $1 WHERE "merchantReference" = $2`,
        [status, merchantReference],
      );
    }

    this.loadStateFromFile();
    const record = this.inMemoryCache[merchantReference];
    if (record) {
      record.status = status;
      this.persistStateToFile();
    }
  }

  /**
   * Thực hiện hoàn tiền bồi hoàn (Compensation Refund) qua cổng thanh toán theo BR-REFUND-OCC (FIX-15 & FIX-16)
   */
  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.ensureTables();

      const txRows = await this.dataSource.query(
        `SELECT * FROM "mock_gateway_transactions" WHERE "merchantReference" = $1`,
        [req.merchantReference],
      );
      if (txRows.length === 0) {
        return {
          status: 'FAILED',
          refundTransactionId: '',
          reason: 'Không tìm thấy giao dịch gốc tại cổng thanh toán.',
        };
      }

      const existingRefund = await this.dataSource.query(
        `SELECT * FROM "mock_gateway_refunds" WHERE "refundKey" = $1`,
        [req.refundKey],
      );
      if (existingRefund.length > 0) {
        return {
          status: existingRefund[0].status,
          refundTransactionId: existingRefund[0].refundTransactionId,
          reason: existingRefund[0].reason || undefined,
        };
      }

      const refundOutcome =
        req.mockOutcome === 'FAILED'
          ? 'FAILED'
          : req.mockOutcome === 'PENDING'
          ? 'PENDING'
          : 'SUCCESS';
      const refundTxId = `GW-REFUND-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const refundReason =
        refundOutcome === 'FAILED'
          ? 'Cổng thanh toán từ chối hoàn tiền.'
          : refundOutcome === 'PENDING'
          ? 'Cổng thanh toán đang xử lý hoàn tiền.'
          : null;

      try {
        await this.dataSource.query(
          `INSERT INTO "mock_gateway_refunds" ("merchantReference", "refundKey", "refundTransactionId", "status", "amount", "reason")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT ("refundKey") DO UPDATE SET "refundKey" = EXCLUDED."refundKey"`,
          [req.merchantReference, req.refundKey, refundTxId, refundOutcome, req.amount, refundReason],
        );
      } catch {
        // Concurrency race
      }

      const canonicalRef = await this.dataSource.query(
        `SELECT * FROM "mock_gateway_refunds" WHERE "refundKey" = $1`,
        [req.refundKey],
      );

      return {
        status: canonicalRef[0].status,
        refundTransactionId: canonicalRef[0].refundTransactionId,
        reason: canonicalRef[0].reason || undefined,
      };
    }

    // Fallback file & bộ nhớ khi không có DB
    this.loadStateFromFile();
    const record = this.inMemoryCache[req.merchantReference];
    if (!record) {
      return {
        status: 'FAILED',
        refundTransactionId: '',
        reason: 'Không tìm thấy giao dịch gốc tại cổng thanh toán.',
      };
    }

    if (record.refunds && record.refunds[req.refundKey]) {
      return record.refunds[req.refundKey];
    }

    const refundOutcome =
      req.mockOutcome === 'FAILED'
        ? 'FAILED'
        : req.mockOutcome === 'PENDING'
        ? 'PENDING'
        : 'SUCCESS';
    const refundTxId = `GW-REFUND-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const refundRecord: GatewayRefundResult = {
      status: refundOutcome,
      refundTransactionId: refundTxId,
      reason:
        refundOutcome === 'FAILED'
          ? 'Cổng thanh toán từ chối hoàn tiền.'
          : refundOutcome === 'PENDING'
          ? 'Cổng thanh toán đang xử lý hoàn tiền.'
          : undefined,
    };

    if (!record.refunds) {
      record.refunds = {};
    }
    record.refunds[req.refundKey] = refundRecord;
    this.persistStateToFile();

    return refundRecord;
  }

  /**
   * Cập nhật trạng thái hoàn tiền (phục vụ test)
   */
  async setRefundStatus(
    refundKey: string,
    status: 'SUCCESS' | 'FAILED' | 'PENDING',
    merchantReference?: string,
    amount?: number,
  ): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.ensureTables();
      const existing = await this.dataSource.query(
        `SELECT * FROM "mock_gateway_refunds" WHERE "refundKey" = $1`,
        [refundKey],
      );
      if (existing.length > 0) {
        await this.dataSource.query(
          `UPDATE "mock_gateway_refunds" SET "status" = $1 WHERE "refundKey" = $2`,
          [status, refundKey],
        );
      } else {
        const mRef = merchantReference || 'TEST-MERCHANT-REF';
        const amt = amount || 0;
        await this.dataSource.query(
          `INSERT INTO "mock_gateway_refunds" ("merchantReference", "refundKey", "refundTransactionId", "status", "amount", "reason")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [mRef, refundKey, `GW-REFUND-INIT-${Date.now()}`, status, amt, null],
        );
      }
    }

    this.loadStateFromFile();
    let found = false;
    for (const tx of Object.values(this.inMemoryCache)) {
      if (tx.refunds && tx.refunds[refundKey]) {
        tx.refunds[refundKey].status = status;
        found = true;
      }
    }
    if (!found && merchantReference && this.inMemoryCache[merchantReference]) {
      if (!this.inMemoryCache[merchantReference].refunds) {
        this.inMemoryCache[merchantReference].refunds = {};
      }
      this.inMemoryCache[merchantReference].refunds[refundKey] = {
        status,
        refundTransactionId: `GW-REFUND-INIT-${Date.now()}`,
      };
    }
    this.persistStateToFile();
  }

  /**
   * Xóa sạch trạng thái phục vụ test isolation
   */
  async clear(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        await this.ensureTables();
        await this.dataSource.query(`DELETE FROM "mock_gateway_refunds"`);
        await this.dataSource.query(`DELETE FROM "mock_gateway_transactions"`);
      } catch {
        // Ignored
      }
    }

    this.inMemoryCache = {};
    try {
      if (fs.existsSync(this.storeFilePath)) {
        fs.unlinkSync(this.storeFilePath);
      }
    } catch {
      // Ignored
    }
  }
}
