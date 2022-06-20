import { ApiProperty } from "@nestjs/swagger";

export class CreateDocumentDto {
    @ApiProperty({ description: '文档标题', example: '测试标题'})
    title: string;

    @ApiProperty({ description: '内容', example: '<p>内容</p>'})
    content: string;
}
