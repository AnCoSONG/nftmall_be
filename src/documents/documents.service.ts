import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}
  async create(createDocumentDto: CreateDocumentDto) {
    const document = this.documentRepository.create(createDocumentDto);
    return await sqlExceptionCatcher(this.documentRepository.save(document));
  }

  async findAll() {
    return await sqlExceptionCatcher(this.documentRepository.find());
  }

  async list(page: number, limit: number, title: string) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.documentRepository.findAndCount({
        where: {
          title: Like(`%${title ?? ''}%`),
        },
        order: { update_date: 'DESC' },
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

  async findOne(id: string) {
    return await sqlExceptionCatcher(this.documentRepository.findOne(id));
  }

  async findByTitle(title: string) {
    return await sqlExceptionCatcher(
      this.documentRepository.find({
        title,
      }),
    );
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.findOne(id);
    const merged = this.documentRepository.merge(document, updateDocumentDto);
    return await sqlExceptionCatcher(this.documentRepository.save(merged));
  }

  async remove(id: string) {
    const document = await this.findOne(id);
    return await sqlExceptionCatcher(this.documentRepository.remove(document));
  }
}
