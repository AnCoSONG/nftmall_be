import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UsePipes,
  ParseBoolPipe,
} from '@nestjs/common';
import { PublishersService } from './publishers.service';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { ApiTags } from '@nestjs/swagger';
// import { CreateProductDto } from '../products/dto/create-product.dto';
import { JoiValidationPipe } from '../pipes/joi-validation.pipe';
import {
  CreatePublisherSchema,
  UpdatePublisherSchema,
} from './schemas/publishers.schema';

@ApiTags('创作者/发行方')
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(CreatePublisherSchema))
  create(@Body() createPublisherDto: CreatePublisherDto) {
    return this.publishersService.create(createPublisherDto);
  }

  @Get()
  findAll() {
    return this.publishersService.findAll();
  }

  @Get('/list')
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
    @Query('id') id: string,
    @Query('name') name: string
  ) {
    return this.publishersService.list(page, limit, with_relation, id, name);
  }

  @Get('/query')
  query(@Query('limit', ParseIntPipe) limit: number, @Query('with_relation', ParseBoolPipe) with_relation: boolean, @Query('name') name: string) {
    return this.publishersService.query(limit, with_relation, name)
  }

  @Get(':id')
  findOne(
    @Query('only_works', ParseBoolPipe) only_works: boolean,
    @Param('id') id: string,
  ) {
    if (only_works) {
      return this.publishersService.findOneWorks(id);
    } else {
      return this.publishersService.findOne(id);
    }
  }

  //! publish已在affair内实现
  // @Post('/publish')
  // @UsePipes(new JoiValidationPipe(PublishProductSchema))
  // publishNewProduct(
  //   @Query('publisher_name') publisher_name: string,
  //   @Body() createProductDto: CreateProductDto,
  // ) {
  //   return this.publishersService.publishNewProduct(
  //     publisher_name,
  //     createProductDto,
  //   );
  // }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(UpdatePublisherSchema))
  update(
    @Param('id') id: string,
    @Body() updatePublisherDto: UpdatePublisherDto,
  ) {
    return this.publishersService.update(id, updatePublisherDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.publishersService.remove(id);
  }
}
