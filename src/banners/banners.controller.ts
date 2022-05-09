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
import { ApiTags } from '@nestjs/swagger';
import { JoiValidationPipe } from 'src/pipes/joi-validation.pipe';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import {
  CreateBannerSchema,
  UpdateBannerSchema,
} from './schemas/banner.schema';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(CreateBannerSchema))
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannersService.create(createBannerDto);
  }

  @Get()
  findAll() {
    return this.bannersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.bannersService.findOne(+id);
  }

  //! 当只更新link时，只能从前端限制其不许为空。
  @Patch(':id')
  @UsePipes(new JoiValidationPipe(UpdateBannerSchema))
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.bannersService.update(+id, updateBannerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.bannersService.remove(+id);
  }
}
