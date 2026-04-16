import { PipelinesService } from '../../pipelines/pipelines.service';

interface PipelineDeps {
  valueStreams: { all: Array<{ id: string }> };
}

const PIPELINES = [
  { name: 'B2B Direct Sales', purpose: 'Face-to-face/direct exchanges', color: '#6366f1' },
  { name: 'B2B eCommerce Sales', purpose: 'Digital channels and B2B e-commerce', color: '#8b5cf6' },
  { name: 'B2C eCommerce Sales', purpose: 'Online retail and direct-to-consumer sales', color: '#d97706' }
];

export async function seedPipelines(service: PipelinesService, deps: PipelineDeps) {
  const pipelines: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < PIPELINES.length; i++) {
    const data = PIPELINES[i];
    const valueStream = deps.valueStreams.all[i % deps.valueStreams.all.length];

    const pipeline = await service.create({
      name: data.name,
      purpose: data.purpose,
      color: data.color,
      valueStreamId: valueStream.id,
    });
    pipelines.push({ id: pipeline.id, name: pipeline.name });
  }

  return pipelines;
}
