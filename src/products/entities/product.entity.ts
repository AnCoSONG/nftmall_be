import { DateAndVersion } from 'src/common/enities';
import { Genre } from 'src/genres/entities/genre.entity';
import { Publisher } from 'src/publishers/entities/publisher.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SupportType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  D3 = '3D',
  HYBRID = 'hybrid',
}
@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column()
  preview_img: string;

  @Column({
    type: 'enum',
    enum: SupportType,
    default: SupportType.IMAGE,
  })
  type: SupportType;

  @ManyToMany(() => Genre, {
    cascade: true, // 创建商品会自动创建类别
  })
  @JoinTable()
  genres: Genre[]; // 藏品类别，可能有多个

  @ManyToMany(() => Tag, {
    cascade: true, // 创建商品会自动创建标签
  })
  @JoinTable()
  tags: Tag[]; // 藏品标签，可能有多个

  @ManyToOne(() => Publisher, (publisher) => publisher.works, {
    // https://stackoverflow.com/questions/55098023/typeorm-cascade-option-cascade-ondelete-onupdate
    onDelete: 'CASCADE', //! when publisher is deleted, the product of the publisher is deleted too.
    orphanedRowAction: 'delete', // 当publisher被删除时，被删除的product也会被删除
  })
  publisher: Publisher; // 发行商/创作者

  @Column({ type: 'smallint', unsigned: true })
  publish_count: number; // 发行数量

  @Column({ type: 'smallint', unsigned: true })
  stock_count: number; // 库存数量

  @Column({ type: 'tinyint', unsigned: true })
  limit: number; // 限购数量

  @Column(() => DateAndVersion)
  prod: DateAndVersion; // 创建，更新和版本封装在一个对象中
}
