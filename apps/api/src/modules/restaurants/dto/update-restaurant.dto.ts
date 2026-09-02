import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';
import { CreateTableDto } from './create-table.dto';



export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
export class UpdateTableDto extends PartialType(CreateTableDto) {}


