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
import { onChainStatus, ProductAttribute, SupportType, Tag } from '../../common/const';
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
  preview_img: string; // 首页商品预览图

  @Column()
  preview_src: string; // 藏品预览资源 购买页面/藏品详情页面展示 可能均为3D模型

  @Column()
  src: string; // 藏品实际资源 图像？音频？视频？3D模型本体
  // will show in the product page

  @Column()
  poster: string;

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

  @Column({ type: 'int', unsigned: true })
  publish_count: number; // 发行数量

  @Column({ type: 'int', unsigned: true })
  stock_count: number; // 库存数量

  @Column({ type: 'tinyint', unsigned: true })
  limit: number; // 限购数量

  @Column({type: 'bool', default: false })
  visible: boolean;

  @Column({type: 'enum', enum: ProductAttribute, default: ProductAttribute.normal})
  attribute: ProductAttribute;

  @Column()
  chain_src: string;

  @Column({type: 'bool', default: false})
  is_soldout: boolean;

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
  nft_class_id: string | null; // 由于bsn create nft class返回的是一个不缺的事务，因此需要加入队列动态去判断是否完成了处理，完成后才能上链

  @Column({
    type: 'enum',
    enum: onChainStatus,
    default: onChainStatus.PENDING,
  })
  on_chain_status: onChainStatus;

  @Column({ type: 'varchar', nullable: true })
  operation_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tx_hash: string | null;

  @Column({ nullable: true })
  publisher_id: string;

  @ManyToOne(() => Publisher, (publisher) => publisher.works, {
    // https://stackoverflow.com/questions/55098023/typeorm-cascade-option-cascade-ondelete-onupdate
    onDelete: 'CASCADE', //! when publisher is deleted, the product of the publisher is deleted too.
    orphanedRowAction: 'delete', // 当publisher被删除时，被删除的product也会被删除
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
