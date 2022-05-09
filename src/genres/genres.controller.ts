import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { ApiTags } from '@nestjs/swagger';
import { JoiValidationPipe } from '../pipes/joi-validation.pipe';
import { CreateGenreSchema, UpdateGenreSchema } from './schemas/genres.schema';

@ApiTags('藏品类别')
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(CreateGenreSchema))
  create(@Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto);
  }

  @Get()
  findAll(@Query('with_products', ParseBoolPipe) withProducts: boolean) {
    return this.genresService.findAll(withProducts);
  }

  @Get('/list')
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ) {
    return this.genresService.list(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.genresService.findOne(+id);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(UpdateGenreSchema))
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    return this.genresService.update(+id, updateGenreDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.genresService.remove(+id);
  }
}
