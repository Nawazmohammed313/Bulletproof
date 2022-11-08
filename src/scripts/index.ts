import { Service, Inject } from 'typedi';
import config from '@/config';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import events from '@/subscribers/events';
import EthersService from '@/services/ethers';
import { Container, Logger } from 'winston';
import { ethers, utils } from 'ethers';
import { ILog } from '@/interfaces/ILog';
import { IBlock } from '@/interfaces/IBlock';
import Web3 from 'web3';
import { createClient } from 'redis';
import PcsService from '@/services/pcs';

@Service()
export default class ScriptService {
  constructor(
    @Inject('ethersService') private ethersService: EthersService,
    @Inject('pgk') private pgk: NamespaceKnex.KnexTypes,
    @Inject('logger') private logger: Logger,
    @Inject('pcsService') private pcsService: PcsService,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async main() {
    this.ethersService.httpProvider.on('block', async (blockNumber: number) => {
      // console.log('blockNumber', blockNumber);
      // const parsedSwapsByBlockNumber = await this.pcsService.parseSwapsByBlockNumber(blockNumber);
    });
  }
}
