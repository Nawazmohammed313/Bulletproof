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
  } catch (e) {
    LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
    throw e;
  }
};
