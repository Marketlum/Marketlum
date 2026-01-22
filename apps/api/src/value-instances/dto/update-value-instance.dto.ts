import { PartialType } from '@nestjs/swagger';
import { CreateValueInstanceDto } from './create-value-instance.dto';

export class UpdateValueInstanceDto extends PartialType(CreateValueInstanceDto) {}
