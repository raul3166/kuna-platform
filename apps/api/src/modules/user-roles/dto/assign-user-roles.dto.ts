import {
  IsArray,
  ArrayNotEmpty,
  IsString,
} from 'class-validator';

export class AssignUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds: string[];
}
