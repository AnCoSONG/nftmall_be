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
import { requestKeyErrorException } from '../exceptions';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class CollectorsService {
  private readonly logger = new Logger(CollectorsService.name);
  constructor(
    @InjectRepository(Collector)
    private collectorRepository: Repository<Collector>,
    private readonly bsnService: BsnService,
    private readonly httpService: HttpService,
  ) {}

  async create(createCollectorDto: CreateCollectorDto) {
    //! 创建时不上链，避免没必要的花费，参与抽签必须要上链，用户可以申请上链或者参与抽签自动上链
    const collector = this.collectorRepository.create(createCollectorDto);
    return await sqlExceptionCatcher(this.collectorRepository.save(collector));
  }

  async findAll(with_relation = false) {
    return await sqlExceptionCatcher(
      this.collectorRepository.find({
        relations: with_relation ? ['orders', 'collections'] : [],
      }),
    );
  }

  async findOne(id: number, with_relation = false) {
    const collector = await sqlExceptionCatcher(
      this.collectorRepository.findOne(id, {
        relations: with_relation ? ['orders', 'collections'] : [],
      }),
    );
    if (!collector) {
      throw new NotFoundException(`Collector with id ${id} not found`);
    }
    return collector;
  }

  async list(page: number, limit: number, with_relation = false) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.collectorRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: with_relation ? ['orders', 'collections'] : [],
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
    return {
      total,
      data,
      page,
      limit,
    };
  }

  async findByPhone(
    phone: string,
    with_relation = false,
  ): Promise<Collector[]> {
    return await sqlExceptionCatcher(
      this.collectorRepository.find({
        where: { phone },
        relations: with_relation ? ['orders', 'collections'] : [],
      }),
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

  async getCollections(id: number) {
    const collector = await this.findOne(id, true);
    return collector.collections;
  }

  async isIdCheck(id: number) {
    const collector = (await this.findOne(id)) as Collector;
    if (collector.real_name && collector.real_id) {
      // real name 和 real id 都不为空
      return true;
    } else {
      return false;
    }
  }

  async idcheck(name: string, idcard: string, id: number) {
    const isChecked = await this.isIdCheck(id);
    if (isChecked) {
      return {
        code: -1,
        message: '已经实名认证过了',
      };
    }
    const res = (
      await this.httpService
        .get('/idcardcheck', {
          params: { name, idcard },
        })
        .toPromise()
        .catch((e) => {
          return e.response;
        })
    ).data;
    if (res.code === 200) {
      if (res.data.result === 0) {
        // data.result: 0 一致，1 不一致，2 无记录
        // 一致 -> 更新用户realname和real_id
        const updateRes = await this.update(id, {
          real_name: name,
          real_id: idcard,
        });
        return {
          code: 0,
          message: '身份认证通过',
          updateRes,
        };
      } else if (res.data.result === 1) {
        // 不一致
        return {
          code: 1,
          message: '身份不一致',
        };
      } else {
        return {
          code: 2,
          message: '无记录，无法完成实名认证',
        };
      }
    } else {
      return {
        code: 3,
        message: '身份检查失败 ' + res.code,
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
