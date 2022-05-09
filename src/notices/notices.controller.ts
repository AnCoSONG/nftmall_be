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
} from '@nestjs/common';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateNoticeSchema,
  UpdateNoticeSchema,
} from './schemas/notices.schema';
import { JoiValidationPipe } from '../pipes/joi-validation.pipe';

@ApiTags('公告')
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(CreateNoticeSchema))
  create(@Body() createNoticeDto: CreateNoticeDto) {
    return this.noticesService.create(createNoticeDto);
  }

  @Get()
  findAll() {
    return this.noticesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.noticesService.findOne(+id);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(UpdateNoticeSchema))
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateNoticeDto: UpdateNoticeDto,
  ) {
    return this.noticesService.update(+id, updateNoticeDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.noticesService.remove(+id);
  }
}
