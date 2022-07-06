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
  UseGuards,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { ApiTags } from '@nestjs/swagger';
import { JoiValidationPipe } from '../pipes/joi-validation.pipe';
import { CreateGenreSchema, UpdateGenreSchema } from './schemas/genres.schema';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('藏品类别')
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(CreateGenreSchema))
  @UseGuards(AdminGuard)
  create(@Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  findAll(@Query('with_relation', ParseBoolPipe) with_relation: boolean) {
    return this.genresService.findAll(with_relation);
  }

  @Get('/list')
  @UseGuards(AdminGuard)
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
  ) {
    return this.genresService.list(page, limit, with_relation);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.genresService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @UsePipes(new JoiValidationPipe(UpdateGenreSchema))
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    return this.genresService.update(+id, updateGenreDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.genresService.remove(+id);
  }
}
