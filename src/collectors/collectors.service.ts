import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';
import { Collector } from './entities/collector.entity';
import { sqlExceptionCatcher } from 'src/common/utils';
import { BsnService } from '../bsn/bsn.service';

@Injectable()
export class CollectorsService {
  private readonly logger = new Logger(CollectorsService.name);
  constructor(
    @InjectRepository(Collector)
    private collectorRepository: Repository<Collector>,
    private readonly bsnService: BsnService,
  ) {}

  async create(createCollectorDto: CreateCollectorDto) {
    //! 创建时不上链，避免没必要的花费，参与抽签必须要上链，用户可以申请上链或者参与抽签自动上链
    const collector = this.collectorRepository.create(createCollectorDto);
    return await sqlExceptionCatcher(this.collectorRepository.save(collector));
  }

  async findAll() {
    return await sqlExceptionCatcher(this.collectorRepository.find());
  }

  async findOne(id: number) {
    const collector = await sqlExceptionCatcher(
      this.collectorRepository.findOne(id),
    );
    if (!collector) {
      throw new NotFoundException(`Collector with id ${id} not found`);
    }
    return collector;
  }

  async findByPhone(phone: string): Promise<Collector[]> {
    return await sqlExceptionCatcher(
      this.collectorRepository.find({ where: { phone } }),
    );
  }

  async applyForChain(id: number) {
    const collector = await this.findOne(id);
    if (!collector.bsn_address) {
      const bsnAccount = await this.bsnService.create_account(
        collector.username,
      );
      const res = await this.update(id, { bsn_address: bsnAccount.account });
      return {
        message: 'apply for chain success',
        collector: res,
      };
    } else {
      // 已经上链，则提示已经上链
      return {
        message: '已上链',
      };
    }
  }

  async update(id: number, updateCollectorDto: UpdateCollectorDto) {
    const collector = await this.findOne(id);
    // console.log(updateCollectorDto);
    const merged = this.collectorRepository.merge(
      collector,
      updateCollectorDto,
    );
    // console.log('merged', merged);
    return await sqlExceptionCatcher(this.collectorRepository.save(merged));
  }

  async remove(id: number) {
    return await sqlExceptionCatcher(this.collectorRepository.delete(id));
  }
}
