import { shortcuts } from '../src/helpers';
import { main_ as getShortcutMain } from './getShortcut';

async function main() {
  const args = process.argv.slice(2);
  const chain = args[0];

  if (!chain) throw new Error('chain argument is required');

  for (const protocol of Object.keys(shortcuts)) {
    for (const market of Object.keys(shortcuts[protocol])) {
      try {
        await getShortcutMain([chain, protocol, market]);
      } catch (e) {
        console.error(
          `Unexpected error getting shortcut for chain: ${chain} | protocol: ${protocol} | market: ${market}, skipping. Reason: ${e}`,
        );
      }
    }
  }
}

main();
