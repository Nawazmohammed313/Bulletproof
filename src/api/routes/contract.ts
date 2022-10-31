import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import AuthService from '@/services/auth';
import { IUserInputDTO } from '@/interfaces/IUser';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import ContractService from '@/services/contract';

const route = Router();

const endpoint = '/v1/contracts';
export default (app: Router) => {
  app.use(endpoint, route);

  route.get(
    '/',
    celebrate({
      body: Joi.object({}),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`GET ${endpoint}/ `);
      try {
        const contractServiceInstance = Container.get(ContractService);
        const contracts = await contractServiceInstance.getContracts(req.query);
        return res.status(200).json(contracts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.get('/id/:id', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug(`GET ${endpoint}/ `);
    try {
      const contractServiceInstance = Container.get(ContractService);
      const contracts = await contractServiceInstance.getContractById(req.params.id);
      return res.status(200).json(contracts);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  route.get('/address/:address', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug(`GET ${endpoint}/ `);
    try {
      const contractServiceInstance = Container.get(ContractService);
      const contracts = await contractServiceInstance.getContractByAddress(req.params.address);
      return res.status(200).json(contracts);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  route.post(
    '/',
    celebrate({
      body: Joi.object({
        coAddress: Joi.string().required(),
        coName: Joi.string(),
        coSymbol: Joi.string(),
        coDecimals: Joi.number(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`POST ${endpoint}/ `);
      console.log(req.body);
      try {
        const contractServiceInstance = Container.get(ContractService);
        const contracts = await contractServiceInstance.createContract(req.body);
        return res.status(200).json(contracts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.put(
    '/id/:id',
    celebrate({
      body: Joi.object({
        coAddress: Joi.string().required(),
        coName: Joi.string(),
        coSymbol: Joi.string(),
        coDecimals: Joi.number(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`PUT ${endpoint}/ `);
      try {
        const contractServiceInstance = Container.get(ContractService);
        const contracts = await contractServiceInstance.updateContractById(req.params.id, req.body);
        return res.status(200).json(contracts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.put(
    '/address/:address',
    celebrate({
      body: Joi.object({
        coAddress: Joi.string().required(),
        coName: Joi.string(),
        coSymbol: Joi.string(),
        coDecimals: Joi.number(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug(`PUT ${endpoint}/ `);
      try {
        const contractServiceInstance = Container.get(ContractService);
        const contracts = await contractServiceInstance.updateContractByAddress(req.params.address, req.body);
        return res.status(200).json(contracts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.delete('/id/:id', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug(`DELETE ${endpoint}/ `);
    try {
      const contractServiceInstance = Container.get(ContractService);
      const contracts = await contractServiceInstance.deleteContractById(req.params.id);
      return res.status(200).json(contracts);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  route.delete('/address/:address', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug(`DELETE ${endpoint}/ `);
    try {
      const { address } = req.params;
      console.log('req.params', req.params);
      console.log('req.body', req.body);
      console.log('req.query', req.query);
      const contractServiceInstance = Container.get(ContractService);
      const contracts = await contractServiceInstance.deleteContractByAddress(req.params.address);
      return res.status(200).json(contracts);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};
