import { Document, Model } from 'mongoose';
import { IUser } from '@/interfaces/IUser';
import { Knex } from 'knex';
declare global {
  namespace Express {
    export interface Request {
      currentUser: IUser & Document;
    }
  }

  // namespace Models {
  //   export type UserModel = Model<IUser & Document>;
  // }

  namespace NamespaceKnex {
    export type KnexTypes = Knex;
  }
}
