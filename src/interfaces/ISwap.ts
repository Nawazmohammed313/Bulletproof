export interface ISwap {
  blockNumber: number;
  txHash: string;
  logIdx: number;
  pairAddr: string;
  tokenAddr: string;
  liquidityAddr: string;
  tokenReserve: string;
  lpReserve: string;
  type: string;
  lastLpUsd: number;
  lpUsd: number;
  lastTokenPrice: number;
  tokenPrice: number;
  timestamp: number;
  date: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
