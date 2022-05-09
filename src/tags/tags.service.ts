import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { requestKeyErrorException } from '../exceptions';
import { Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';
import { sqlExceptionCatcher } from '../common/utils';

@Injectable()
export class TagsService {
  constructor(@InjectRepository(Tag) private tagRepository: Repository<Tag>) {}

  async checkExists(name: string) {
    const tag = await sqlExceptionCatcher(this.tagRepository.findOne({ name }));
    if (tag) {
      throw new requestKeyErrorException(
        `Tag with name ${name} already exists`,
      );
    }
  }

  async create(createTagDto: CreateTagDto) {
    // 创建前先检查是否存在
    await this.checkExists(createTagDto.name);
    const newTag = this.tagRepository.create(createTagDto);
    return await sqlExceptionCatcher(this.tagRepository.save(newTag));
  }

  async findAll() {
    return await sqlExceptionCatcher(this.tagRepository.find());
  }

  async list(page: number, limit: number) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    return await sqlExceptionCatcher(
      this.tagRepository.find({
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
  }

  async findOne(id: number) {
    const tag = await sqlExceptionCatcher(this.tagRepository.findOne(id));
    if (!tag) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }
    return tag;
  }

  async findOneByName(name: string) {
    const tag = await sqlExceptionCatcher(this.tagRepository.findOne({ name }));
    if (!tag) {
      throw new NotFoundException(`Tag with name ${name} not found`);
    }
    return tag;
  }

  async update(id: number, updateTagDto: UpdateTagDto) {
    // 拿到ID对应的tag
    const tag = await sqlExceptionCatcher(this.tagRepository.findOne(id));
    if (!tag) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }
    if (updateTagDto.name !== tag.name) {
      // 如果和自己之前的名称不一样，则检查是否存在其他重名可能
      await this.checkExists(updateTagDto.name);
    }
    // 使用Merge更简洁
    const merged = this.tagRepository.merge(tag, updateTagDto);
    return await sqlExceptionCatcher(this.tagRepository.save(merged));
    // try {
    //   return await this.tagRepository.save(tag);
    // } catch (e) {
    //   throw new BadRequestException(e.message);
    // }
  }

  async remove(id: number) {
    return await sqlExceptionCatcher(
      this.tagRepository.softRemove(await this.findOne(id)),
    );
  }
}
