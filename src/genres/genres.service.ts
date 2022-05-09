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

  async findAll() {
    return await sqlExceptionCatcher(this.genreRepository.find());
  }

  async list(page: number, limit: number) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    return await sqlExceptionCatcher(
      this.genreRepository.find({
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
  }

  async findOne(id: number) {
    const genre = await this.genreRepository.findOne(id);
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
      this.genreRepository.softRemove(await this.findOne(id)),
    );
  }
}
