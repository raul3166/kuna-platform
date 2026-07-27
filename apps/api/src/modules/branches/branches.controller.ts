import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
  ) {}

  @ApiOperation({
  summary: 'Create a new branch',
})

@ApiResponse({
  status: 201,
  description: 'Branch created successfully',
})
  @Post()
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }
  @ApiOperation({
  summary: 'Get all active branches',
})

@ApiResponse({
  status: 200,
  description: 'List of active branches',
})
  @Get()
  findAll() {
    return this.branchesService.findAll();
}
@ApiOperation({
  summary: 'Get branch by id',
})

@ApiResponse({
  status: 200,
  description: 'Branch found',
})

@ApiResponse({
  status: 404,
  description: 'Branch not found',
})
@Get(':id')
findOne(@Param('id') id: string) {
  return this.branchesService.findOne(id);
}
@ApiOperation({
  summary: 'Update a branch',
})

@ApiResponse({
  status: 200,
  description: 'Branch updated successfully',
})

@ApiResponse({
  status: 404,
  description: 'Branch not found',
})

@ApiResponse({
  status: 409,
  description: 'Branch code already exists',
})
@Patch(':id')
update(
  @Param('id') id: string,
  @Body() updateBranchDto: UpdateBranchDto,
) {
  return this.branchesService.update(id, updateBranchDto);
}
@ApiOperation({
  summary: 'Deactivate a branch',
})

@ApiResponse({
  status: 200,
  description: 'Branch deactivated successfully',
})

@ApiResponse({
  status: 404,
  description: 'Branch not found',
})
@Delete(':id')
remove(@Param('id') id: string) {
  return this.branchesService.remove(id);
}
}
