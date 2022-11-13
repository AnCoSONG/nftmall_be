import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';
import { Collector } from './entities/collector.entity';
import { redisExceptionCatcher, sqlExceptionCatcher } from 'src/common/utils';
import { BsnService } from '../bsn/bsn.service';
import { requestKeyErrorException } from '../exceptions';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { CryptoJsService } from '../lib/crypto-js/crypto-js.service';
import { productItemStatus } from '../common/const';
@Injectable()
export class CollectorsService {
  private readonly logger = new Logger(CollectorsService.name);
  constructor(
    @InjectRepository(Collector)
    private collectorRepository: Repository<Collector>,
    private readonly bsnService: BsnService,
    private readonly httpService: HttpService,
    @InjectRedis() private readonly redis: Redis,
    private readonly cryptoJsService: CryptoJsService,
  ) {}

  async create(createCollectorDto: CreateCollectorDto) {
    // 创建时直接上链
    let isDuplicated = false;
    const result = await this.countByUsername(createCollectorDto.username);
    if (result && result !== 0) {
      isDuplicated = true;
    }
    while (isDuplicated) {
      // 直到不重复
      const newName = `藏家${createCollectorDto.phone.substring(
        7,
      )}${randomBytes(4).toString('hex')}`;
      const count = await this.countByUsername(newName);
      if (count === 0) {
        isDuplicated = false;
        createCollectorDto.username = newName;
        createCollectorDto.initial_username = newName;
      } else {
        continue;
      }
    }
    const collector = this.collectorRepository.create(createCollectorDto);
    const createAccountRes = await this.bsnService.create_account(
      collector.initial_username,
    );
    if (createAccountRes.code) {
      throw new InternalServerErrorException('Error when create bsn account');
    }
    collector.bsn_address = createAccountRes.account ?? null; // 设置BSN地址
    return await sqlExceptionCatcher(this.collectorRepository.save(collector));
  }

  async findAll(with_relation = false) {
    return await sqlExceptionCatcher(
      this.collectorRepository.find({
        relations: with_relation
          ? ['orders', 'collections', 'send_transfers', 'receive_transfers']
          : [],
      }),
    );
  }

  async findByUsername(username: string): Promise<Collector[]> {
    return await sqlExceptionCatcher(
      this.collectorRepository.find({
        where: { username },
      }),
    );
  }

  async countByUsername(username: string): Promise<number> {
    return await sqlExceptionCatcher(
      this.collectorRepository.count({
        where: { username },
      }),
    );
  }

  async findOne(id: number, with_relation = false) {
    const collector = await sqlExceptionCatcher(
      this.collectorRepository.findOne(id, {
        relations: with_relation
          ? ['orders', 'collections', 'send_transfers', 'receive_transfers']
          : [],
      }),
    );
    if (!collector) {
      throw new NotFoundException(`Collector with id ${id} not found`);
    }
    if (collector.real_id && collector.real_name) {
      delete collector.real_id;
      delete collector.real_name;
      collector['is_verified'] = true;
    } else {
      collector['is_verified'] = false;
    }
    return collector as Collector;
  }

  async list(
    page: number,
    limit: number,
    with_relation = false,
    query = { id: '', username: '', phone: '' },
  ) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.collectorRepository.findAndCount({
        where: {
          id: Like(`%${query.id ? query.id : ''}%`),
          username: Like(`%${query.username ? query.username : ''}%`),
          phone: Like(`%${query.phone ? query.phone : ''}%`),
        },
        order: { update_date: 'DESC' },
        relations: with_relation
          ? ['orders', 'collections', 'collections.product']
          : [],
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
        collector.initial_username,
      );
      if (bsnAccount.code) {
        throw new InternalServerErrorException('BSN Error when create account');
      }
      const res = await this.update(id, { bsn_address: bsnAccount.account });
      return {
        code: 0,
        message: '上链成功',
      };
    } else {
      // 已经上链，则提示已经上链
      return {
        code: 1,
        message: '请勿重复申请上链',
      };
    }
  }

  async getCollections(id: number) {
    const collector = await this.findOne(id, true);
    return collector.collections.filter((item) => {
      return item.status !== productItemStatus.TRANSFERED;
    });
  }

  async getSendTransfers(id: number) {
    const collector = await this.findOne(id, true);
    return collector.send_transfers;
  }

  async getReceiveTransfers(id: number) {
    const collector = await this.findOne(id, true);
    return collector.receive_transfers;
  }

  async isIdCheck(id: number) {
    const collector = (await this.findOne(id)) as Collector & {
      is_verified: boolean;
    };
    if (collector.is_verified) {
      // real name 和 real id 都不为空
      return true;
    } else {
      return false;
    }
  }

  async idcheck(_name: string, _idcard: string, id: number) {
    const name = this.cryptoJsService.decrypt(_name);
    const idcard = this.cryptoJsService.decrypt(_idcard);
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
          params: { name, idcard},
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
        if (!res.data.birthday) {
          throw new InternalServerErrorException('no birthday field');
        }
        if (!this.isAgeQualified(res.data.birthday)) {
          return {
            code: 4,
            message: '未满16岁的用户不允许使用本平台，实名认证不予通过。',
          };
        }
        // 存储加密版本
        const updateRes = await this.update(id, {
          real_name: _name,
          real_id: _idcard,
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

  async isdraw(id: number, product_id: string) {
    const collector = await this.findOne(id);
    return await this.redis.sismember(
      `seckill:drawset:${product_id}`,
      collector.id,
    );
  }

  async islucky(id: number, product_id: string) {
    const collector = await this.findOne(id);
    const isExist = await redisExceptionCatcher(
      this.redis.exists(`seckill:luckyset:${product_id}`),
    );
    if (isExist === 0) {
      return -1; // 还未生成
    } else if (isExist === 1) {
      // 0 不存在，1存在
      return await redisExceptionCatcher(
        this.redis.sismember(`seckill:luckyset:${product_id}`, collector.id),
      );
    } else {
      throw new InternalServerErrorException(
        '[ERROR] collectors.islucky redis retval wrong: ' + isExist,
      );
    }
  }

  async addCredit(id: number, addonCredit: number) {
    const res = await this.collectorRepository.increment(
      { id },
      'credit',
      addonCredit,
    );
    return res;
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

  isAgeQualified(birthday: string) {
    const year = parseInt(birthday.slice(0, 4));
    const month = parseInt(birthday.slice(4, 6));
    const day = parseInt(birthday.slice(6, 8));
    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth() + 1;
    const currentDay = date.getDate();
    const age = currentYear - year;
    if (age > 16) {
      return true;
    } else {
      if (age < 16) {
        return false;
      } else {
        if (currentMonth < month) {
          return false;
        } else if (currentMonth > month) {
          return true;
        } else {
          if (currentDay >= day) {
            return true;
          } else {
            return false;
          }
        }
      }
    }
  }
}
