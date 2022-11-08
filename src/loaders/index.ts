import expressLoader from './express';
import dependencyInjectorLoader from './dependencyInjector';
import knexLoader from './knex';
// import jobsLoader from './jobs';
import Logger from './logger';
// We have to import at least all the events once so they can be triggered
import './events';
import Container from 'typedi';
import ScriptService from '@/scripts';
import PcsService from '@/services/pcs';

export default async ({ expressApp }) => {
  // const mongoConnection = await mongooseLoader();
  // Logger.info('✌️ MongoDB loaded and connected!');

  const pgk = knexLoader();
  Logger.info('✌️ knex loaded and connected!');

  /**
   * WTF is going on here?
   *
   * We are injecting the mongoose models into the DI container.
   * I know this is controversial but will provide a lot of flexibility at the time
   * of writing unit tests, just go and check how beautiful they are!
   */

  // const userModel = {
  //   name: 'userModel',
  //   // Notice the require syntax and the '.default'
  //   model: require('../models/user').default,
  // };

  // It returns the agenda instance because it's needed in the subsequent loaders
  // const { agenda } = await dependencyInjectorLoader(
  //   {
  //     mongoConnection,
  //     models: [userModel],
  //   },
  //   pgk,
  // );

  await dependencyInjectorLoader(pgk);
  Logger.info('✌️ Dependency Injector loaded');

  await expressLoader({ app: expressApp });
  Logger.info('✌️ Express loaded');

  const pcsService: PcsService = Container.get('pcsService');
  pcsService.init();

  const scriptService = Container.get(ScriptService);
  scriptService.main();
};
