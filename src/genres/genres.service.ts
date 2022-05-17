import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { Genre } from './entities/genre.entity';

@Injectable()
export class GenresService {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}
  async create(createGenreDto: CreateGenreDto) {
    const genre = this.genreRepository.create(createGenreDto);
    return await sqlExceptionCatcher(this.genreRepository.save(genre));
  }

  async findAll(withProducts: boolean) {
    return await sqlExceptionCatcher(
      this.genreRepository.find(
        withProducts ? { relations: ['products'] } : {},
      ),
    );
  }

  async list(page: number, limit: number, with_relation = false) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.genreRepository.findAndCount({
        relations: with_relation ? ['products'] : [],
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const genre = await sqlExceptionCatcher(
      this.genreRepository.findOne(id, {
        relations: ['products'],
      }),
    );
    if (!genre) {
      throw new NotFoundException(`Genre with id ${id} not found`);
    }
    return genre;
  }

  async update(id: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.findOne(id);
    const merged = this.genreRepository.merge(genre, updateGenreDto);
    return await sqlExceptionCatcher(this.genreRepository.save(merged));
  }

  async remove(id: number) {
    return await sqlExceptionCatcher(
      this.genreRepository.remove(await this.findOne(id)),
    );
  }
}
