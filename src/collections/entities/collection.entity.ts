import { DateAndVersion } from 'src/common/enities';
import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class Collection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  collector_id: number;

  @Column()
  product_item_id: number;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
