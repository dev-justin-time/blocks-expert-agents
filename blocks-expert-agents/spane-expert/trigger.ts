import { createClient, textPart } from '@blocks-network/sdk';

async function main() {
  const client = createClient();

  const testQueries = [
    "What is the SPANE scale?",
    "How do you score SPANE?",
    "Tell me about the 25000 participant Faraday cage study",
    "SPANE German validation",
    "What is the difference between SPANE and PANAS?"
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Query: ${query}`);
    const session = await client.sendMessage({
      agentName: 'spane_expert',
      requestParts: [textPart(JSON.stringify({ text: query }), 'request')],
    });

    const result = await session.waitForArtifact();
    const text = Buffer.from(result.data).toString('utf-8');
    console.log(`✅ Response:\n${text.substring(0, 500)}...`);
  }
}

main().catch(console.error);
