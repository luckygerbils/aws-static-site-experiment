import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Handler } from 'aws-lambda'

interface PutPlantingInput {
  operation: "PutPlanting",
  plantingId: string,
  planting: {
    name: string,
  }
}

interface PutPlantingOutput {
}

interface PutPlantInput {
  operation: "PutPlant",
  plantId: string,
  plant: {
    name: string,
  }
}

interface PutPlantOutput {
}

interface UnknownOperationInput {
  operation: string,
}

interface ErrorOutput {
  error: string,
}

const s3 = new S3Client({});

const OPERATIONS = {
  PutPlanting: async function putPlanting(input: PutPlantingInput): Promise<PutPlantingOutput> {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.DATA_BUCKET,
      Key: `planting/${input.plantingId}.json`,
      Body: JSON.stringify(input.planting),
    }));
    return {};
  },
  PutPlant: async function putPlant(input: PutPlantInput): Promise<PutPlantOutput> {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.DATA_BUCKET,
      Key: `plant/${input.plantId}.json`,
      Body: JSON.stringify(input.plant),
    }));
    return {};
  },
};

type OperationInput = Parameters<typeof OPERATIONS[keyof typeof OPERATIONS]>[0];
type Input = OperationInput | UnknownOperationInput
type Output = PutPlantingOutput | PutPlantOutput | ErrorOutput

export const handler: Handler<Input, Output> = async (input) => {
    console.log('Received event:', JSON.stringify(input, null, 2));
    if (!isValidOperation(input)) {
      return {
        error: input.operation == null 
          ? "Missing operation"
          : `Unknown operation ${input.operation}`,
      };
    }
    return OPERATIONS[input.operation](input as any);
};

function isValidOperation(input: Input): input is OperationInput {
  return input.operation != null
      && input.operation in OPERATIONS;
}