import { Service, Inject } from 'typedi';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import { Logger } from 'winston';
import EthersService from './ethers';
import { BigNumber, Contract, ethers, utils } from 'ethers';
import { pcsPairAbi } from '../abis/pcsPairAbi';
import { Interface } from 'ethers/lib/utils';
import { ILog } from '@/interfaces/ILog';
import { IPair } from '@/interfaces/IPair';
import { IToken } from '@/interfaces/IToken';
import genericTokenAbi from '@/abis/genericTokenAbi';

import { pcsFactoryAbi } from '@/abis/pcsFactoryAbi';
import { pcsRouterAbi } from '@/abis/pcsRouterAbi';

import Decimal from 'decimal.js';

const safeErrors = { duplicate: 'duplicate key value violates unique constraint' };

@Service()
export default class PcsService {
  public pairInterface: Interface = new Interface(pcsPairAbi);

  public pcsRouterAddr: string = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
  public pcsFactoryAddr: string = '0xca143ce32fe78f1f7019d7d551a6402fc5350c73';

  public approvalEvent: string = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
  public burnEvent: string = '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496';
  public mintEvent: string = '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f';
  public swapEvent: string = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
  public syncEvent: string = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';
  public transferEvent: string = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  public wbnbAddr: string = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
  public busdAddr: string = '0xe9e7cea3dedca5984780bafc599bd69add087d56';
  public usdtAddr: string = '0x55d398326f99059ff775485246999027b3197955';
  public usdcAddr: string = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';

  public wbnbPriceUsd: { addr: string; lastUpdated: Date };
  public validLpLatestQuotesUsd: { [addr: string]: { quote: number } } = { [this.wbnbAddr]: { quote: null } };

  public validLpAddrs = {
    [this.wbnbAddr]: this.wbnbAddr,
    [this.busdAddr]: this.busdAddr,
    [this.usdtAddr]: this.usdtAddr,
    [this.usdcAddr]: this.usdcAddr,
  };

  public pairs: { [addr: string]: IPair } = {};
  public tokens: { [addr: string]: IToken } = {};

  constructor(
    @Inject('ethersService') private ethersService: EthersService,
    @Inject('pgk') private pgk: NamespaceKnex.KnexTypes,
    @Inject('logger') private logger: Logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async init() {
    const pairs: IPair[] = await this.pgk.select('*').from('Pair');
    pairs.forEach(pair => {
      this.pairs[pair.addr] = pair;
    });

    const tokens: IToken[] = await this.pgk.select('*').from('Token');
    tokens.forEach(token => {
      this.tokens[token.addr] = token;
    });

    // const pair = await this.getPairByTokenAddresses(this.wbnbAddr, this.usdcAddr);
    // const reserves = await this.getReservesByPairAddr(pair.addr);

    const reserve0 = BigNumber.from('3333333333333333333');
    const formattedReserve0 = ethers.utils.formatUnits(reserve0, 18);

    const reserve1 = BigNumber.from('999999999999999999');
    const formattedReserve1 = ethers.utils.formatUnits(reserve0, 18);

    const ratio0 = reserve0.div(reserve1);
    const ratio1 = reserve1.div(reserve0);

    console.log(ratio0.toString());
    console.log(ratio1.toString());

    // const reserve0BNAfterRemovingDecimals = BigNumber.from(formattedReserve0);
    // console.log(reserve0BNAfterRemovingDecimals);
  }

  public async getReservesByPairAddr(addr: string): Promise<string> {
    const pairContract = new Contract(addr, pcsPairAbi, this.ethersService.wallets.emptyWallet);
    const reserves = await pairContract.getReserves();
    return reserves;
  }

  public async getTokenPriceUsd(addr) {}

  // public async quote(amountA, reserveA, reserveB) {
  //   const routerContract = await new Contract(this.pcsRouterAddr, pcsRouterAbi, this.ethersService.wallets.emptyWallet);
  //   const quote = await routerContract.quote(amountA, reserveA, reserveB);
  //   return quote;
  // }

  public async getPairQuotesUSDFromReserves(
    token0: string,
    token1: string,
    token0Decimals: number,
    token1Decimals: number,
    reserves: ethers.BigNumber[],
  ) {
    return [BigNumber.from(2), BigNumber.from(1)];
  }

  public isSwap(log: ILog): boolean {
    return log.topics[0] === this.swapEvent && log.topics[1] === this.pcsRouterAddr;
  }

  public isSync(log: ILog): boolean {
    return log.topics[0] === this.syncEvent;
  }

  public async parseSwapsByBlockNumber(blockNumber: number) {
    const logs = await this.ethersService.httpProvider.getLogs({
      fromBlock: blockNumber,
      toBlock: blockNumber,
      topics: [[this.swapEvent, this.syncEvent]],
    });

    const swapSyncSets: [ILog, ILog][] = [];
    for (let i = 0; i < logs.length - 1; i += 2) {
      const log: ILog = logs[i];
      const nextLog: ILog = logs[i + 1];
      if (this.isSync(log) && this.isSwap(nextLog) && log.transactionHash === nextLog.transactionHash) {
        const syncLog = log;
        const swapLog = nextLog;
        swapSyncSets.push([syncLog, swapLog]);
      }
    }

    for (let i = 0; i < swapSyncSets.length; i++) {
      try {
        const [sync, swap] = swapSyncSets[i];
        const pairAddr: string = sync.address.toLowerCase();
        const pair = await this.getPairByAddr(pairAddr);
        const token0 = await this.getTokenByAddr(pair.token0Addr);
        const token1 = await this.getTokenByAddr(pair.token1Addr);

        let lpToken: IToken;
        let token: IToken;
        if (this.validLpAddrs[token0.addr]) {
          lpToken = token0;
          token = token1;
        } else if (this.validLpAddrs[token1.addr]) {
          lpToken = token1;
          token = token0;
        } else {
          continue;
        }

        console.log([lpToken, token]);
        console.log('---------------');

        const parsedSync = this.pairInterface.parseLog(sync);
        const parsedswap = this.pairInterface.parseLog(swap);
      } catch (error) {
        console.log(error.message);
      }
    }
  }

  public async getPairByTokenAddresses(token0Addr, token1Addr): Promise<IPair> {
    const factoryContract = await new Contract(
      this.pcsFactoryAddr,
      pcsFactoryAbi,
      this.ethersService.wallets.emptyWallet,
    );
    const pairAddr: string = (await factoryContract.getPair(token0Addr, token1Addr)).toLowerCase();
    const pair: IPair = await this.getPairByAddr(pairAddr);
    return pair;
  }

  public async getPairByAddr(addr: string): Promise<IPair> {
    if (this.pairs[addr]) {
      return this.pairs[addr];
    } else {
      const pairContract = new Contract(addr, pcsPairAbi, this.ethersService.wallets.emptyWallet);
      const token0Addr = (await pairContract.token0()).toLowerCase();
      const token1Addr = (await pairContract.token1()).toLowerCase();
      const pair: IPair = {
        addr: addr,
        token0Addr: token0Addr,
        token1Addr: token1Addr,
      };
      this.pairs[addr] = pair;
      try {
        await this.pgk('Pair').insert(pair).returning('addr');
      } catch (error) {
        if (!error.message.includes(safeErrors.duplicate)) {
          console.error(error.message);
          throw new Error(error.message);
        }
      }
      return pair;
    }
  }

  public async getTokenByAddr(addr: string): Promise<IToken> {
    if (this.tokens[addr]) {
      return this.tokens[addr];
    } else {
      const tokenContract = new Contract(addr, genericTokenAbi, this.ethersService.wallets.emptyWallet);
      const token: IToken = {
        addr: addr,
        name: await tokenContract.name(),
        decimals: await tokenContract.decimals(),
        symbol: await tokenContract.symbol(),
      };
      this.tokens[addr] = token;
      try {
        await this.pgk('Token').insert(token).returning('addr');
      } catch (error) {
        if (!error.message.includes(safeErrors.duplicate)) {
          console.error(error.message);
          throw new Error(error.message);
        }
      }
      return token;
    }
  }

  public async parseSwapSyncSet(swapSyncSet) {}
}
