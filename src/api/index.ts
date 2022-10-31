import { Router } from 'express';
// import auth from './routes/auth';
// import user from './routes/user';
// import agendash from './routes/agendash';
import contract from './routes/contract';
import db from './routes/db';

// guaranteed to get dependencies
export default () => {
  const app = Router();
  // auth(app);
  // user(app);
  // agendash(app);
  contract(app);
  db(app);

  return app;
};
