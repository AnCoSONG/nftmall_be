import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    return await this.genreRepository.save(genre);
  }

  async findAll() {
    return await this.genreRepository.find();
  }

  async list(page: number, limit: number) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    return await this.genreRepository.find({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: number) {
    const genre = await this.genreRepository.findOne(id);
    if (!genre) {
      throw new NotFoundException(`Genre with id ${id} not found`);
    }
    return genre;
  }

  async update(id: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.genreRepository.findOne(id);
    if (!genre) {
      throw new NotFoundException(`Genre with id ${id} not found`);
    }
    for (const key in updateGenreDto) {
      if (genre.hasOwnProperty(key)) {
        genre[key] = updateGenreDto[key];
      } else {
        throw new requestKeyErrorException(`Key ${key} not supported`);
      }
    }
    return await this.genreRepository.save(genre);
  }

  async remove(id: number) {
    return await this.genreRepository.softRemove(await this.findOne(id));
  }
}
