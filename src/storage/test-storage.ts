import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  endpoint: 'http://localhost:8333',
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'admin',
    secretAccessKey: '',
  },
});

async function test() {
  const result = await client.send(new ListBucketsCommand({}));
  console.log('Connected successfully!');
  console.log(result.Buckets);
}

test().catch(console.error);

// npx ts-node src/storage/test-storage.ts #for tesing
