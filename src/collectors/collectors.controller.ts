import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JoiValidationPipe } from '../pipes/joi-validation.pipe';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';
import {
  CreateCollectorSchema,
  UpdateCollectorSchema,
} from './schemas/collector.schema';

@ApiTags('藏家')
@Controller('collectors')
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(CreateCollectorSchema))
  create(@Body() createCollectorDto: CreateCollectorDto) {
    return this.collectorsService.create(createCollectorDto);
  }

  @Get()
  findAll() {
    return this.collectorsService.findAll();
  }

  @Post('/:id/apply')
  async applyForChain(@Param('id', ParseIntPipe) id: string) {
    return await this.collectorsService.applyForChain(+id);
  }

  @Get('/by')
  findByPhone(@Query('phone') phone: string) {
    return this.collectorsService.findByPhone(phone);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.collectorsService.findOne(+id);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(UpdateCollectorSchema))
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateCollectorDto: UpdateCollectorDto,
  ) {
    return this.collectorsService.update(+id, updateCollectorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collectorsService.remove(+id);
  }
}
