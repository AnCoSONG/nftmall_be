import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';
import { Collector } from './entities/collector.entity';
import * as dayjs from 'dayjs'

@Injectable()
export class CollectorsService {
  constructor(
    @InjectRepository(Collector)
    private collectorRepository: Repository<Collector>,
  ) {}

  async create(createCollectorDto: CreateCollectorDto) {
    const collector = this.collectorRepository.create(createCollectorDto);
    return await this.collectorRepository.save(collector);
  }

  async findAll() {
    return await this.collectorRepository.find();
  }

  async findOne(id: number) {
    return await this.collectorRepository.findOne(id);
  }

  async update(id: number, updateCollectorDto: UpdateCollectorDto) {
    return await this.collectorRepository.update(id, updateCollectorDto);
  }

  async remove(id: number) {
    return await this.collectorRepository.delete(id);
  }
}
