import { createClient, textPart } from '@blocks-network/sdk';

async function main() {
  const client = createClient();

  const testQueries = [
    "What is the SPANE scale?",
    "How do I create a stream in Blocks?",
    "Can SPANE be used with Blocks streaming?",
    "What is the difference between emotional frequency and data frequency?",
    "How to build a well-being monitoring agent?"
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Query: ${query}`);
    const session = await client.sendMessage({
      agentName: 'integrated_knowledge_expert',
      requestParts: [textPart(JSON.stringify({ text: query }), 'request')],
    });

    const result = await session.waitForArtifact();
    const text = Buffer.from(result.data).toString('utf-8');
    console.log(`✅ Response:\n${text.substring(0, 500)}...`);
  }
}

main().catch(console.error);
