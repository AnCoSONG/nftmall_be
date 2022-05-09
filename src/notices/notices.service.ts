import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlExceptionCatcher } from '../common/utils';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { Notice } from './entities/notice.entity';

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
  ) {}

  async create(createNoticeDto: CreateNoticeDto) {
    const notice = this.noticeRepository.create(createNoticeDto);
    return await sqlExceptionCatcher(this.noticeRepository.save(notice));
  }

  async findAll() {
    return await sqlExceptionCatcher(this.noticeRepository.find());
  }

  async findOne(id: number) {
    return await sqlExceptionCatcher(this.noticeRepository.findOne(id));
  }

  async update(id: number, updateNoticeDto: UpdateNoticeDto) {
    const notice = await this.findOne(id);
    if (!notice) {
      throw new Error('公告不存在');
    }
    const merged = this.noticeRepository.merge(notice, updateNoticeDto);
    return await sqlExceptionCatcher(this.noticeRepository.save(merged));
  }

  async remove(id: number) {
    const notice = await this.findOne(id);
    if (!notice) {
      throw new Error('公告不存在');
    }
    return await sqlExceptionCatcher(this.noticeRepository.softRemove(notice));
  }
}
