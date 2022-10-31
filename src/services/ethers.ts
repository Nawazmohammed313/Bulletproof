import Container, { Service, Inject } from 'typedi';
import config from '@/config';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import events from '@/subscribers/events';
import { ethers } from 'ethers';
import moment from 'moment';
import websocket from 'ws';

@Service()
export default class EthersService {
  constructor(@Inject('logger') private logger, @EventDispatcher() private eventDispatcher: EventDispatcherInterface) {}

  public async init() {
    try {
      const EXPECTED_PONG_BACK = 15000;
      const KEEP_ALIVE_CHECK_INTERVAL = 3000;
      let pingTimeout = null;
      let keepAliveInterval = null;

      const provider = new ethers.providers.WebSocketProvider(config.quicknodeWs);
      console.log('provider.websocket.readyState', provider.websocket.readyState);

      provider._websocket.on('open', async () => {
        keepAliveInterval = setInterval(() => {
          provider._websocket.ping();
          console.log('provider.websocket.readyState', provider.websocket.readyState);
          pingTimeout = setTimeout(() => {
            provider._websocket.terminate();
          }, EXPECTED_PONG_BACK);
        }, KEEP_ALIVE_CHECK_INTERVAL);
      });

      provider._websocket.on('close', () => {
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} QuicknodeWS Closed`);
        clearInterval(keepAliveInterval);
        clearTimeout(pingTimeout);
        this.init();
      });

      provider._websocket.on('pong', () => {
        clearInterval(pingTimeout);
      });
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
