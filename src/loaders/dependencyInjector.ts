import { EventDispatcher } from '@/decorators/eventDispatcher';
import ScriptService from '@/scripts';
import EthersService from '@/services/ethers';
import PcsService from '@/services/pcs';
import eventDispatcher from 'event-dispatch';
import { Container } from 'typedi';
import LoggerInstance from './logger';

// export default ({ mongoConnection, models }: { mongoConnection; models: { name: string; model: any }[] }, pgk: any) => {
//   try {
//     models.forEach(m => {
//       Container.set(m.name, m.model);
//     });

//     const agendaInstance = agendaFactory({ mongoConnection });
//     const mgInstance = new Mailgun(formData);

//     Container.set('pgk', pgk);
//     Container.set('agendaInstance', agendaInstance);
//     Container.set('logger', LoggerInstance);
//     Container.set('emailClient', mgInstance.client({ key: config.emails.apiKey, username: config.emails.apiUsername }));
//     Container.set('emailDomain', config.emails.domain);

//     LoggerInstance.info('✌️ Agenda injected into container');

//     return { agenda: agendaInstance };
//   } catch (e) {
//     LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
//     throw e;
//   }
// };

export default (pgk: NamespaceKnex.KnexTypes) => {
  try {
    Container.set('pgk', pgk);
    Container.set('logger', LoggerInstance);
    Container.set('eventDispatcher', EventDispatcher);
    Container.set('ethersService', new EthersService(Container.get('logger'), Container.get('eventDispatcher')));
    Container.set(
      'pcsService',
      new PcsService(
        Container.get('ethersService'),
        Container.get('pgk'),
        Container.get('logger'),
        Container.get('eventDispatcher'),
      ),
    );
  } catch (e) {
    LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
    throw e;
  }
};
