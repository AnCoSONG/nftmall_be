import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';
import { Collector } from './entities/collector.entity';
import * as dayjs from 'dayjs';
import { sqlExceptionCatcher } from 'src/common/utils';

@Injectable()
export class CollectorsService {
  constructor(
    @InjectRepository(Collector)
    private collectorRepository: Repository<Collector>,
  ) {}

  async create(createCollectorDto: CreateCollectorDto) {
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

  async update(id: number, updateCollectorDto: UpdateCollectorDto) {
    const collector = await this.findOne(id);
    const merged = this.collectorRepository.merge(
      collector,
      updateCollectorDto,
    );
    return await sqlExceptionCatcher(this.collectorRepository.save(merged));
  }

  async remove(id: number) {
    return await sqlExceptionCatcher(this.collectorRepository.delete(id));
  }
}
