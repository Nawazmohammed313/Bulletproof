import EthersService from '@/services/ethers';
import eventDispatcher from 'event-dispatch';
import LoggerInstance from './logger';

export default async () => {
  const eths = await new EthersService(LoggerInstance, eventDispatcher);
  await eths.init();
  console.log('eths', eths);
  return eths;
};
