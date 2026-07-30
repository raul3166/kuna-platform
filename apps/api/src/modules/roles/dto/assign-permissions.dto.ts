import {
  IsArray,
  ArrayNotEmpty,
  IsString,
} from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({
    each: true,
  })
  permissionIds: string[];
}
