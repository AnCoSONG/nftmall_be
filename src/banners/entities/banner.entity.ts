import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  imgsrc: string;

  @Column({ type: 'varchar', length: 255 })
  link: string;
}
