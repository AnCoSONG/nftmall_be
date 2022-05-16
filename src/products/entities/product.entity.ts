import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { SupportType, Tag } from '../../common/const';
import { Genre } from '../../genres/entities/genre.entity';
import { ProductItem } from '../../product-items/entities/product-item.entity';
import { Publisher } from '../../publishers/entities/publisher.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  preview_img: string;

  @Column()
  src: string; // store the product resource hosted in CDN
  // will show in the product page

  @Column({
    type: 'enum',
    enum: SupportType,
    default: SupportType.IMAGE,
  })
  type: SupportType;

  @Column({ type: 'json', default: null, nullable: true })
  tags: Tag[]; // 藏品标签，可能有多个

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'json', default: null, nullable: true })
  details: string[]; // 图像数组

  @Column({ type: 'smallint', unsigned: true })
  publish_count: number; // 发行数量

  @Column({ type: 'smallint', unsigned: true })
  stock_count: number; // 库存数量

  @Column({ type: 'tinyint', unsigned: true })
  limit: number; // 限购数量

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;

  @Column({ type: 'timestamp', nullable: true, width: 6 })
  sale_timestamp: Date;

  @Column({ type: 'timestamp', nullable: true, width: 6 })
  draw_timestamp: Date;

  @Column({ type: 'timestamp', nullable: true, width: 6 })
  draw_end_timestamp: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nft_class_id: string | null; // 异步更新

  @Column({ nullable: true })
  publisher_id: number;

  @ManyToOne(() => Publisher, (publisher) => publisher.works, {
    // https://stackoverflow.com/questions/55098023/typeorm-cascade-option-cascade-ondelete-onupdate
    onDelete: 'CASCADE', //! when publisher is deleted, the product of the publisher is deleted too.
    orphanedRowAction: 'soft-delete', // 当publisher被删除时，被删除的product也会被删除
  })
  @JoinColumn({ name: 'publisher_id' })
  publisher: Publisher; // 发行商/创作者

  @OneToMany(() => ProductItem, (item) => item.product, {
    cascade: true, // 在oneToMany开启级联，添加Product时会自动向ProductItem表里添加记录
  })
  items: ProductItem[];

  @ManyToMany(() => Genre, (genre) => genre.products, {
    cascade: true, // 创建商品会自动创建类别
  })
  @JoinTable({
    name: 'product_genre',
    joinColumn: {
      name: 'product_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'genre_id',
      referencedColumnName: 'id',
    },
  })
  genres: Genre[]; // 藏品类别，可能有多个
}
