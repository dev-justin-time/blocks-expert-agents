import { createClient, textPart } from '@blocks-network/sdk';

async function main() {
  const client = createClient();

  const testQueries = [
    "What is request streaming?",
    "How do I create a stream in Blocks?",
    "What is the difference between bytes and events format?",
    "How do I install the Blocks SDK?",
    "What is bundleSizeBytes?"
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Query: ${query}`);
    const session = await client.sendMessage({
      agentName: 'blocks_streaming_expert',
      requestParts: [textPart(JSON.stringify({ text: query }), 'request')],
    });

    const result = await session.waitForArtifact();
    const text = Buffer.from(result.data).toString('utf-8');
    console.log(`✅ Response:\n${text.substring(0, 500)}...`);
  }
}

main().catch(console.error);
