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
import { setInterval } from 'timers';
import { sleep } from '@/utils';

const safeErrors = { duplicate: 'duplicate key value violates unique constraint' };
let updateWbnbInterval;

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
  public cakeAddr: string = '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82';
  public btcAddr: string = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
  public ethAddr: string = '0x2170ed0880ac9a755fd29b2688956bd959f933f8';
  public busdAddr: string = '0xe9e7cea3dedca5984780bafc599bd69add087d56';
  public usdtAddr: string = '0x55d398326f99059ff775485246999027b3197955';
  public usdcAddr: string = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';

  public wbnbPriceUsd: number;

  public validLpLatestQuotesUsd = {
    [this.wbnbAddr]: null,
    [this.cakeAddr]: null,
    [this.btcAddr]: null,
    [this.ethAddr]: null,
    [this.busdAddr]: 1,
    [this.usdtAddr]: 1,
    [this.usdcAddr]: 1,
  };

  public validLpAddrs = {
    [this.wbnbAddr]: this.wbnbAddr,
    [this.cakeAddr]: this.cakeAddr,
    [this.btcAddr]: this.btcAddr,
    [this.ethAddr]: this.ethAddr,
    [this.busdAddr]: this.busdAddr,
    [this.usdtAddr]: this.usdtAddr,
    [this.usdcAddr]: this.usdcAddr,
  };

  public pairs: { [addr: string]: IPair } = {};
  public tokens: { [addr: string]: IToken } = {};

  public invalidPairs: { [addr: string]: IPair } = {};

  constructor(
    @Inject('ethersService') private ethersService: EthersService,
    @Inject('pgk') private pgk: NamespaceKnex.KnexTypes,
    @Inject('logger') private logger: Logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
    this.updateCurrentTokenToBusd = this.updateCurrentTokenToBusd.bind(this);
  }

  //! INIT
  public async init() {
    // return;
    const pairs: IPair[] = await this.pgk.select('*').from('Pair');
    pairs.forEach(pair => {
      this.pairs[pair.addr] = pair;
    });

    const tokens: IToken[] = await this.pgk.select('*').from('Token');
    tokens.forEach(token => {
      this.tokens[token.addr] = token;
    });

    await this.updateLps();

    //! check to make sure current quotes are populated
    this.validLpLatestQuotesUsdArePopulated();

    //! start parsing current block number swaps
    await this.parseCurrentSwaps();

    while (true) {
      await sleep(60 * 1000);
      await this.updateLps();
    }
  }

  private async updateLps() {
    await this.updateCurrentTokenToBusd(this.wbnbAddr);
    await this.updateCurrentTokenToBusd(this.cakeAddr);
    await this.updateCurrentTokenToBusd(this.btcAddr);
    await this.updateCurrentTokenToBusd(this.ethAddr);
  }

  private validLpLatestQuotesUsdArePopulated() {
    const quotes = Object.values(this.validLpLatestQuotesUsd);
    for (let i = 0; i < quotes.length; i++) {
      const quote = quotes[i];
      if (!quote) {
        throw new Error('lp latest quotes were not populated');
      }
    }
  }

  // //TODO needs to be more dynamic and done better
  private async updateCurrentTokenToBusd(addr: string): Promise<void> {
    const price = await this.getCurrentTokenToBusd(addr);
    this.validLpLatestQuotesUsd[addr] = price;
  }

  // //TODO needs to be more dynamic and done better
  private async getCurrentTokenToBusd(addr: string): Promise<number> {
    try {
      const tokenA = await this.getTokenByAddr(addr);
      const tokenB = await this.getTokenByAddr(this.busdAddr);
      const pair = await this.getPairByTokenAddresses(addr, this.busdAddr);
      const reserves = await this.getReservesByPairAddr(pair.addr);
      const reserveRatios = this.getRatiosFromReserves(tokenA.decimals, tokenB.decimals, reserves);
      const tokenPositions = this.getTokenPositions(tokenA.addr, tokenB.addr);
      return parseFloat(reserveRatios[tokenPositions[tokenA.addr]].toString());
    } catch (error) {
      console.log(error.message);
      console.log('getTokenPositions');
      console.log({ addr });
      throw new Error(error.message);
    }
  }

  public getTokenPositions(token0Addr: string, token1Addr: string): { [addr: string]: number } {
    try {
      const sortedAddrs = [utils.getAddress(token0Addr), utils.getAddress(token1Addr)].sort();
      return {
        [sortedAddrs[0].toLowerCase()]: 0,
        [sortedAddrs[1].toLowerCase()]: 1,
      };
    } catch (error) {
      console.log(error.message);
      console.log('getTokenPositions');
      console.log({ token0Addr, token1Addr });
      throw new Error(error.message);
    }
  }

  public async getReservesByPairAddr(addr: string): Promise<BigNumber[]> {
    try {
      const pairContract = new Contract(addr, pcsPairAbi, this.ethersService.wallets.emptyWallet);
      const reserves = await pairContract.getReserves();
      return reserves;
    } catch (error) {
      console.log(error.message);
      console.log('getRatiosFromReserves');
      console.log({ addr });
      throw new Error(error.message);
    }
  }

  public getRatiosFromReserves(tokenDecimals: number, LPDecimals: number, reserves: ethers.BigNumber[]): number[] {
    try {
      const tokenDecimal = new Decimal(utils.formatUnits(reserves[0], tokenDecimals));
      const lpDecimal = new Decimal(utils.formatUnits(reserves[1], LPDecimals));

      const tokensPerLpToken = lpDecimal.div(tokenDecimal);
      const lpTokensPerToken = tokenDecimal.div(lpDecimal);

      return [parseFloat(tokensPerLpToken.toString()), parseFloat(lpTokensPerToken.toString())];
    } catch (error) {
      console.log(error.message);
      console.log('getRatiosFromReserves');
      console.log({ tokenDecimals, LPDecimals, reserves });
      throw new Error(error.message);
    }
  }

  public isSwap(log: ILog): boolean {
    return log.topics[0] === this.swapEvent;
  }

  private async isValidPcsSyncSwapSet(syncSwapSet: ILog[]) {
    try {
      const sync = syncSwapSet[0];
      const swap = syncSwapSet[1];

      if (!(sync?.blockNumber && swap?.blockNumber)) {
        return false;
      }

      if (!(sync.transactionHash === swap.transactionHash)) {
        return false;
      }

      if (!(swap.logIndex === sync.logIndex + 1)) {
        return false;
      }

      const pair = await this.getPairByAddr(swap.address);
      if (!(pair && pair.factoryAddr === this.pcsFactoryAddr)) {
        return false;
      }

      return true;
    } catch (error) {
      console.log(error.message);
      console.log('isValidPcsSyncSwapSet');
      console.log({ syncSwapSet });
      throw new Error(error.message);
    }
  }

  public isSync(log: ILog): boolean {
    return log.topics[0] === this.syncEvent;
  }

  public async parseCurrentSwaps() {
    await this.ethersService.httpProvider.on('block', async (blockNumber: number) => {
      console.log({ blockNumber });
      await this.parseSwapsByBlockNumber(blockNumber);
    });
  }

  public async getSyncSwapLogsByBlockNumber(blockNumber) {
    try {
      return await this.ethersService.httpProvider.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
        topics: [[this.swapEvent, this.syncEvent]],
      });
    } catch (error) {
      console.log(error.message);
      console.log('getSyncSwapLogsByBlockNumber');
      console.log({ blockNumber });
      throw new Error(error.message);
    }
  }

  public async parseSwapsByBlockNumber(blockNumber: number) {
    try {
      const logs = await this.getSyncSwapLogsByBlockNumber(blockNumber);
      const syncSwapSets = await this.getSyncSwapSetsFromLogs(logs);
      await this.parseSyncSwapSets(syncSwapSets);
    } catch (error) {
      console.log(error.message);
      console.log('parseSwapsByBlockNumber');
      console.log({ blockNumber });
      throw new Error(error.message);
    }
  }

  public async getSyncSwapSetsFromLogs(logs: ILog[]): Promise<ILog[][]> {
    try {
      const syncSwapSets: ILog[][] = [];
      let syncSwapSet: ILog[] = [];
      for (let i = 0; i < logs.length - 1; i++) {
        try {
          const log: ILog = logs[i];

          if (this.isSync(log)) {
            syncSwapSet[0] = log;
          } else if (this.isSwap(log)) {
            syncSwapSet[1] = log;

            if (this.isValidPcsSyncSwapSet(syncSwapSet)) {
              syncSwapSets.push(syncSwapSet);
            }

            syncSwapSet = [];
          }
        } catch (error) {
          syncSwapSet = [];
          console.log(error.message);
        }
      }

      return syncSwapSets;
    } catch (error) {
      console.log(error.message);
      console.log('getSyncSwapSetsFromLogs');
      console.log({ logs });
      throw new Error(error.message);
    }
  }

  public async parseSyncSwapSets(syncSwapSets: ILog[][]) {
    for (let i = 0; i < syncSwapSets.length; i++) {
      const [sync, swap] = syncSwapSets[i];
      await this.parseSyncSwapSet([sync, swap]);
    }
  }

  public async parseSyncSwapSet(syncSwapSet: ILog[]) {
    try {
      const [sync, swap] = syncSwapSet;

      // const parsedSync = this.pairInterface.parseLog(sync);
      // const parsedswap = this.pairInterface.parseLog(swap);
    } catch (error) {
      console.log(error.message);
      console.log('parseSyncSwapSets');
      console.log({ syncSwapSet });
      throw new Error(error.message);
    }
  }

  public async getPairByTokenAddresses(token0Addr, token1Addr): Promise<IPair> {
    try {
      const factoryContract = await new Contract(
        this.pcsFactoryAddr,
        pcsFactoryAbi,
        this.ethersService.wallets.emptyWallet,
      );
      const pairAddr: string = (await factoryContract.getPair(token0Addr, token1Addr)).toLowerCase();
      const pair: IPair = await this.getPairByAddr(pairAddr);
      return pair;
    } catch (error) {
      console.log(error.message);
      console.log('getPairByTokenAddresses');
      console.log({ token0Addr, token1Addr });
      throw new Error(error.message);
    }
  }

  public async getPairByAddr(addr: string): Promise<IPair> {
    try {
      const lowercasedAddr = addr.toLowerCase();
      if (this.pairs[lowercasedAddr]) {
        return this.pairs[lowercasedAddr];
      } else {
        const pairContract = new Contract(lowercasedAddr, pcsPairAbi, this.ethersService.wallets.emptyWallet);
        if (pairContract.factory) {
          try {
            const factoryAddr = (await pairContract.factory()).toLowerCase();

            const token0Addr = (await pairContract.token0()).toLowerCase();
            const token1Addr = (await pairContract.token1()).toLowerCase();

            let tokenAddr: string;
            let lpAddr: string;
            if (this.validLpAddrs[token0Addr]) {
              lpAddr = token0Addr;
              tokenAddr = token1Addr;
            } else if (this.validLpAddrs[token1Addr]) {
              lpAddr = token1Addr;
              tokenAddr = token0Addr;
            } else {
              return;
            }

            const pair: IPair = {
              addr: lowercasedAddr,
              tokenAddr: tokenAddr,
              lpAddr: lpAddr,
              factoryAddr: factoryAddr,
            };
            this.pairs[lowercasedAddr] = pair;
            try {
              await this.pgk('Pair').insert(pair).returning('addr');
            } catch (error) {
              if (!error.message.includes(safeErrors.duplicate)) {
                console.error(error.message);
                throw new Error(error.message);
              }
            }
            return pair;
          } catch (error) {
            console.log('getPairByAddr');
            console.log({ addr });
          }
        }
      }
    } catch (error) {
      console.log(error.message);
      console.log('getPairByAddr');
      console.log({ addr });
      throw new Error(error.message);
    }
  }

  public async getTokenByAddr(addr: string): Promise<IToken> {
    try {
      const lowercasedAddr = addr.toLowerCase();
      if (this.tokens[lowercasedAddr]) {
        return this.tokens[lowercasedAddr];
      } else {
        const tokenContract = new Contract(lowercasedAddr, genericTokenAbi, this.ethersService.wallets.emptyWallet);
        const token: IToken = {
          addr: lowercasedAddr,
          name: await tokenContract.name(),
          decimals: await tokenContract.decimals(),
          symbol: await tokenContract.symbol(),
        };
        this.tokens[lowercasedAddr] = token;
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
    } catch (error) {
      console.log(error.message);
      console.log('getTokenByAddr');
      console.log({ addr });
      throw new Error(error.message);
    }
  }

  static getPairSwapDataUSD(
    LPPriceUSD,
    transactionType,
    amountIn,
    amountOut,
    tokenReserveAfterSwap,
    tokenDecimals,
    LPReserveAfterSwap,
    LPDecimals,
  ) {
    const swapData = {};

    const tokenReserveAfterSwapBN = utils.parseUnits(tokenReserveAfterSwap, 0);
    const LPReserveAfterSwapBN = utils.parseUnits(LPReserveAfterSwap, 0);
    let tokenReserveBeforeSwapBN;
    let LPReserveBeforeSwapBN;
    let amountInBN;
    let amountOutBN;

    if (transactionType === 'BUY') {
      // amountIn is the LP
      // amountOut is the token

      // LP reserve was added via amountIn after swap
      // token reserve was reduced via amountOut after swap

      // to get LP reserve before swap, we must subtract amountIn
      // to get token reserve before swap, we must add amountOut
      amountInBN = utils.parseUnits(amountIn, 0);
      amountOutBN = utils.parseUnits(amountOut, 0);
      LPReserveBeforeSwapBN = LPReserveAfterSwapBN.sub(amountInBN);
      tokenReserveBeforeSwapBN = tokenReserveAfterSwapBN.add(amountOut);
    } else if (transactionType === 'SELL') {
      // amountIn is the token
      // amountOut is the LP

      // token reserve was added via amountIn after swap
      // LP reserve was reduced via amountOut after swap

      // to get LP reserve before swap, we must add amountOut
      // to get token reserve before swap, we must subtract amountIn
      amountInBN = utils.parseUnits(amountIn, 0);
      amountOutBN = utils.parseUnits(amountOut, 0);
      LPReserveBeforeSwapBN = LPReserveAfterSwapBN.add(amountOutBN);
      tokenReserveBeforeSwapBN = tokenReserveAfterSwapBN.sub(amountInBN);
    }

    swapData.tokenPriceBeforeSwapUSD =
      (parseFloat(utils.formatUnits(LPReserveBeforeSwapBN, LPDecimals)) /
        parseFloat(utils.formatUnits(tokenReserveBeforeSwapBN, tokenDecimals))) *
      LPPriceUSD;
    swapData.tokenPriceAfterSwapUSD =
      (parseFloat(utils.formatUnits(LPReserveAfterSwapBN, LPDecimals)) /
        parseFloat(utils.formatUnits(tokenReserveAfterSwapBN, tokenDecimals))) *
      LPPriceUSD;

    swapData.LPPoolBeforeSwapUSD = parseFloat(
      (parseFloat(utils.formatUnits(LPReserveBeforeSwapBN, LPDecimals)) * LPPriceUSD).toFixed(2),
    );
    swapData.LPPoolAfterSwapUSD = parseFloat(
      (parseFloat(utils.formatUnits(LPReserveAfterSwap, LPDecimals)) * LPPriceUSD).toFixed(2),
    );

    swapData.tokenPoolBeforeSwapUSD = parseFloat(
      (
        (parseFloat(utils.formatUnits(LPReserveBeforeSwapBN, LPDecimals)) /
          parseFloat(utils.formatUnits(tokenReserveBeforeSwapBN, tokenDecimals))) *
        swapData.tokenPriceBeforeSwapUSD
      ).toFixed(2),
    );
    swapData.tokenPoolAfterSwapUSD = parseFloat(
      (
        (parseFloat(utils.formatUnits(LPReserveAfterSwapBN, LPDecimals)) /
          parseFloat(utils.formatUnits(tokenReserveAfterSwapBN, tokenDecimals))) *
        swapData.tokenPriceAfterSwapUSD
      ).toFixed(2),
    );

    if (transactionType === 'BUY') {
      swapData.amountUSD = parseFloat((parseFloat(utils.formatUnits(amountInBN, LPDecimals)) * LPPriceUSD).toFixed(2));
    } else if (transactionType === 'SELL') {
      swapData.amountUSD = parseFloat((parseFloat(utils.formatUnits(amountOutBN, LPDecimals)) * LPPriceUSD).toFixed(2));
    }

    return swapData;
  }
}
