import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { sqlExceptionCatcher } from 'src/common/utils';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner } from './entities/banner.entity';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner) private bannerRepository: Repository<Banner>,
  ) {}
  async create(createBannerDto: CreateBannerDto) {
    const newBanner = this.bannerRepository.create(createBannerDto);
    return await sqlExceptionCatcher(this.bannerRepository.save(newBanner));
  }

  async findAll() {
    return await sqlExceptionCatcher(this.bannerRepository.find());
  }

  async findOne(id: number) {
    const banner = await sqlExceptionCatcher(this.bannerRepository.findOne(id));
    if (!banner) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }
    return banner;
  }

  async update(id: number, updateBannerDto: UpdateBannerDto) {
    const banner = await this.findOne(id);
    const merged = this.bannerRepository.merge(banner, updateBannerDto);
    return await sqlExceptionCatcher(this.bannerRepository.save(merged));
  }

  async remove(id: number) {
    const banner = await this.findOne(id);
    return await sqlExceptionCatcher(this.bannerRepository.softRemove(banner));
  }
}
