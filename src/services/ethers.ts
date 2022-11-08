import Container, { Service, Inject } from 'typedi';
import config from '@/config';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import { ethers, Wallet } from 'ethers';
import moment from 'moment';
import { Logger } from 'winston';

@Service()
export default class EthersService {
  public wsProvider: ethers.providers.WebSocketProvider;
  public httpProvider = new ethers.providers.JsonRpcProvider(config.httpProviderUrl);
  public wallets = {
    emptyWallet: new Wallet('bb64fd4212b0dcc04ab51fa892b852d47ba06398210dea6962fe46506ff63e51', this.httpProvider),
  };

  constructor(
    @Inject('logger') private logger: Logger,
    @Inject('eventDispatcher') private eventDispatcher: EventDispatcherInterface,
  ) {
    this.init();
  }

  public async init() {
    await this.createHttpProvider();

    // cant run HTTP AND WS provider same time
    // await this.createWsProvider();
  }

  private async createHttpProvider() {
    return this.httpProvider;
  }

  private async createWsProvider() {
    try {
      const EXPECTED_PONG_BACK = 15000;
      const KEEP_ALIVE_CHECK_INTERVAL = 3000;
      const CONSOLE_CHECK_INTERVAL = 5000;
      let pingTimeout = null;
      let keepAliveInterval = null;
      let consoleCheckInterval = null;

      this.wsProvider = await new ethers.providers.WebSocketProvider(config.wsProviderUrl);

      this.wsProvider._websocket.on('open', async () => {
        keepAliveInterval = setInterval(() => {
          this.wsProvider._websocket.ping();

          pingTimeout = setTimeout(() => {
            if (this.wsProvider._wsReady) {
              this.wsProvider._websocket.terminate();
            }
          }, EXPECTED_PONG_BACK);
        }, KEEP_ALIVE_CHECK_INTERVAL);

        consoleCheckInterval = setInterval(() => {
          if (!this.wsProvider._wsReady) {
            this.logger.error(`Ethers Service WS NOT READY`);
          }
        }, CONSOLE_CHECK_INTERVAL);
      });

      this.wsProvider._websocket.on('close', () => {
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} QuicknodeWS Closed`);
        clearInterval(keepAliveInterval);
        clearInterval(consoleCheckInterval);
        clearTimeout(pingTimeout);
        this.init();
      });

      this.wsProvider._websocket.on('pong', () => {
        clearInterval(pingTimeout);
      });
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
