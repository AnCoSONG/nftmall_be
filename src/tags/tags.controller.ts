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
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ApiTags } from '@nestjs/swagger';
import { JoiValidationPipe } from 'src/pipes/joi-validation.pipe';
import { CreateTagSchema, UpdateTagSchema } from './schemas/tag.schema';
import { JwtGuard } from '../auth/guards/jwt.guard';

@ApiTags('藏品标签')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(CreateTagSchema))
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get('/by')
  findOneByName(@Query('name') name: string) {
    return this.tagsService.findOneByName(name);
  }

  @Get('/list')
  list(@Query('page') page: number, @Query('limit') limit: number) {
    return this.tagsService.list(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(+id);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(UpdateTagSchema))
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(+id, updateTagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tagsService.remove(+id);
  }
}
