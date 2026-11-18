import { writeFileSync } from 'fs';
import { prompts } from './prompts8.mjs';
for (const V of process.argv.slice(2)) writeFileSync(new URL(`./prompts8-${V}.json`, import.meta.url).pathname, JSON.stringify(prompts(V), null, 1));
