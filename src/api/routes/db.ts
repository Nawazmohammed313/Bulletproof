import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import AuthService from '@/services/auth';
import { IUserInputDTO } from '@/interfaces/IUser';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import ContractService from '@/services/contract';
import DbService from '@/services/db';

const route = Router();

const endpoint = '/v1/db';
export default (app: Router) => {
  app.use(endpoint, route);

  route.post(
    '/create-table',
    celebrate({
      body: Joi.object({ tableName: Joi.string().required() }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`POST ${endpoint}/ `, req.body);
      try {
        const dbServiceInstance = Container.get(DbService);
        console.log(
          'dbServiceInstance[`create${req.body.tableName}Table`]',
          dbServiceInstance[`create${req.body.tableName}Table`],
        );
        const table = await dbServiceInstance[`create${req.body.tableName}Table`]();
        return res.status(200).json(table);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.delete(
    '/drop-table',
    celebrate({
      body: Joi.object({ tableName: Joi.string().required() }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`DELETE ${endpoint}/ `, req.query);
      try {
        const dbServiceInstance = Container.get(DbService);
        const contracts = await dbServiceInstance.dropTable(req.body.tableName);
        return res.status(200).json(contracts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
