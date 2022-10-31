import { Service, Inject } from 'typedi';
import config from '@/config';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import events from '@/subscribers/events';

@Service()
export default class ContractService {
  constructor(
    @Inject('pgk') private pgk: NamespaceKnex.KnexTypes,
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async getContracts(params) {
    try {
      const contracts = await this.pgk.select('*').from('Contract').limit(10);
      return contracts;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getContractById(id) {
    try {
      const contract = await this.pgk.select('*').from('Contract').where(`coId`, `=`, id);
      return contract;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getContractByAddress(address) {
    try {
      const contract = await this.pgk.select('*').from('Contract').where(`coAddress`, `=`, address);
      return contract;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async createContract(params) {
    try {
      const contract = await this.pgk('Contract').insert(params).returning('*');
      return contract;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async updateContractById(id, params) {
    try {
      const contract = await this.pgk('Contract').where(`coId`, `=`, id).update(params).returning('*');
      return contract;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async updateContractByAddress(address, params) {
    try {
      const contract = await this.pgk('Contract').where(`coAddress`, `=`, address).update(params).returning('*');
      console.log(contract);
      return contract;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async deleteContractById(id) {
    try {
      const contract = await this.pgk('Contract').where(`coId`, `=`, id).del().returning('*');
      return contract;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async deleteContractByAddress(address) {
    try {
      const contract = await this.pgk('Contract').where(`coAddress`, `=`, address).del().returning('*');
      return contract;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
