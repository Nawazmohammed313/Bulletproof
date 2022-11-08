import ethers from 'ethers';

export interface IBlock {
  hash: string;
  parentHash: string;
  number: number;
  timestamp: number;
  nonce: string;
  difficulty: number;
  gasLimit: ethers.BigNumber | string;
  gasUsed: ethers.BigNumber | string;
  miner: string;
  extraData: string;
  transactions: string[] | object[] | string;
  _difficulty?: ethers.BigNumber | string;
}
