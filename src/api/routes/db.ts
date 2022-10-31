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
    '/create-contract-table',
    celebrate({
      body: Joi.object({}),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`POST ${endpoint}/ `, req.body);
      try {
        const dbServiceInstance = Container.get(DbService);
        const contracts = await dbServiceInstance.createContractTable(req.body);
        return res.status(200).json(contracts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.delete(
    '/drop-contract-table',
    celebrate({
      body: Joi.object({}),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`DELETE ${endpoint}/ `, req.query);
      try {
        const dbServiceInstance = Container.get(DbService);
        const contracts = await dbServiceInstance.dropContractTable(req.body);
        return res.status(200).json(contracts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
