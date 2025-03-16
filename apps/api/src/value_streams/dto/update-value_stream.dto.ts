import { PartialType } from '@nestjs/swagger';
import { CreateValueStreamDto } from './create-value_stream.dto';

export class UpdateValueStreamDto extends PartialType(CreateValueStreamDto) {}
