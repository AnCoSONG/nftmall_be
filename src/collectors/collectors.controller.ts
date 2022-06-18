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
  ParseBoolPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CollectorId } from '../decorators';
import { JoiValidationPipe } from '../pipes/joi-validation.pipe';
import { CollectorsService } from './collectors.service';
import {
  CreateCollectorDto,
  IDCheckDto,
  IdProductIdDto,
} from './dto/create-collector.dto';
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
  findAll(@Query('with_relation') with_relation: boolean) {
    return this.collectorsService.findAll(with_relation);
  }

  @Get('/list')
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
    @Query('id') id: string,
    @Query('username') username: string,
    @Query('phone') phone: string
  ) {
    return this.collectorsService.list(page, limit, with_relation, { id, username, phone },);
  }

  @Get('/:id/collections')
  async getCollections(@Param('id', ParseIntPipe) id: string) {
    return await this.collectorsService.getCollections(+id);
  }

  @Post('/createBsnAccount/:id')
  async applyForChain(@Param('id', ParseIntPipe) id: string) {
    return await this.collectorsService.applyForChain(+id);
  }

  @Post('/applyBsnAccount')
  @UseGuards(JwtGuard)
  async applyForAccount(@CollectorId() collector_id: number) {
    return await this.collectorsService.applyForChain(collector_id);
  }

  @Get('/byPhone')
  findByPhone(
    @Query('phone') phone: string,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
  ) {
    return this.collectorsService.findByPhone(phone, with_relation);
  }

  @Get('/byUsername')
  findByUsername(@Query('username') username: string) {
    return this.collectorsService.findByUsername(username);
  }

  @Post('/idcheck')
  @UseGuards(JwtGuard)
  idcheck(@CollectorId() collector_id: number, @Body() idcheckDto: IDCheckDto) {
    return this.collectorsService.idcheck(
      idcheckDto.name,
      idcheckDto.id_card,
      collector_id,
    );
  }

  @Get('/isIdCheck')
  @UseGuards(JwtGuard)
  isIdCheck(@CollectorId() collector_id: number) {
    return this.collectorsService.isIdCheck(collector_id);
  }

  @Post('/isdraw')
  isdraw(@Body() isDrawDto: IdProductIdDto) {
    return this.collectorsService.isdraw(
      isDrawDto.collector_id,
      isDrawDto.product_id,
    );
  }

  @Post('/islucky')
  islucky(@Body() isLuckyDto: IdProductIdDto) {
    return this.collectorsService.islucky(
      isLuckyDto.collector_id,
      isLuckyDto.product_id,
    );
  }

  @Post('/addCredit')
  addCredit(
    @Query('id', ParseIntPipe) id: number,
    @Query('credit', ParseIntPipe) credit: number,
  ) {
    return this.collectorsService.addCredit(id, credit);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
  ) {
    return this.collectorsService.findOne(id, with_relation);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(UpdateCollectorSchema))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCollectorDto: UpdateCollectorDto,
  ) {
    return this.collectorsService.update(id, updateCollectorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.collectorsService.remove(id);
  }
}
