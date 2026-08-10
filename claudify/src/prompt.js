import { createInterface } from 'node:readline';

export function confirm(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(message, (answer) => {
      rl.close();
      resolve(/^(y|yes)$/i.test(answer.trim()));
    });
  });
}
