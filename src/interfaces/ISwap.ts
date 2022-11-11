import Decimal from 'decimal.js';

export interface ISwap {
  blockNumber: number;
  txHash: string;
  logIdx: number;

  pairAddr: string;
  tokenAddr: string;
  lpAddr: string;

  gasPrice: Decimal;
  gasLimit: Decimal;

  txFrom: string;
  txTo: string;
  swapSender: string;
  swapTo: string;

  side: string;

  lpReserveUsd: Decimal;

  tokenInUsd: Decimal;
  tokenOutUsd: Decimal;
  lpInUsd: Decimal;
  lpOutUsd: Decimal;

  lpPriceUsd: Decimal;
  tokenPriceUsd: Decimal;

  timestamp: number;

  createdAt?: Date;
  updatedAt?: Date;
}
