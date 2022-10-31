import Container, { Service, Inject } from 'typedi';
import config from '@/config';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import events from '@/subscribers/events';

@Service()
export default class DbService {
  constructor(
    @Inject('pgk') private pgk: NamespaceKnex.KnexTypes,
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async createContractTable() {
    try {
      await this.pgk.schema.dropTableIfExists('Contract');
      const table = await this.pgk.schema.createTable('Contract', table => {
        table.increments('coId').primary();
        table.string('coAddress').unique();
        table.smallint('coDecimals').unsigned();
        table.string('coName');
        table.string('coSymbol');
        table.timestamp('coCreationDate');
        table.timestamps(true, true, true);
      });

      return table;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async dropTable(params) {
    try {
      //  const contracts = await
      //   return contracts;
      const contracts = await this.pgk.select('Contract').limit(10);
      return contracts;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async dropAllTables(params) {
    this.pgk.schema.dropTableIfExists('Contract');
  }

  public async createAllTables(params) {
    this.createContractTable();
  }
}
