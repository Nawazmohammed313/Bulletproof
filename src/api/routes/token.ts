import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import PcsService from '@/services/pcs';

const route = Router();

const endpoint = '/v1/tokens';
export default (app: Router) => {
  app.use(endpoint, route);

  route.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug(`GET ${endpoint}/ `);
    try {
      const pcsService: PcsService = Container.get('pcsService');
      return res.status(200).json(pcsService.tokens);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};
