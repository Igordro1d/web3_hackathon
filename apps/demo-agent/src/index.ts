import 'dotenv/config';
import { createAgent } from '@web3nz/agent-sdk';

async function main() {
  const agent = createAgent({
    network: 'avalanche-fuji',
    privateKey: (process.env.AGENT_PRIVATE_KEY || '0x0') as `0x${string}`,
  });

  const res = await agent.payAndFetch('http://localhost:3000/premium');
  const data = await res.json();
  console.log('Agent received:', data);
}

main().catch(console.error);
