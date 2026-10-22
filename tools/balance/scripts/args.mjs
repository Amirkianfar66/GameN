// Strict command-line reading for the Balance commands. An argument that is not a known option,
// an option without its value and an option given twice are all refused: a misspelt option must
// not silently change what a gate checks. Both "--name value" and "--name=value" are accepted.
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

/** A path as the person who started the command meant it: `npm run` moves into the workspace directory first. */
export function invocationPath(path) {
  return resolve(process.env.INIT_CWD ?? process.cwd(), path);
}

/**
 * @param {{ values?: string[], flags?: string[] }} known option names without their dashes
 * @param {(message: string) => never} refuse called with one sentence; it must end the process
 */
export function readArgs(known, refuse) {
  const names = { values: known.values ?? [], flags: known.flags ?? [] };
  const options = Object.fromEntries([
    ...names.values.map(name => [name, { type: 'string', multiple: true }]),
    ...names.flags.map(name => [name, { type: 'boolean', multiple: true }]),
  ]);
  let given;
  try {
    given = parseArgs({ args: process.argv.slice(2), options, strict: true, allowPositionals: false }).values;
  } catch (error) {
    return refuse(`${error instanceof Error ? error.message.split('\n')[0] : String(error)}.`.replace(/\.\.$/, '.'));
  }
  const once = name => {
    const all = given[name];
    if (all !== undefined && all.length > 1) refuse(`--${name} was given more than once.`);
    return all?.[0];
  };
  const values = {};
  for (const name of names.values) {
    const value = once(name);
    if (value !== undefined && value.trim() === '') refuse(`--${name} was given without a value.`);
    values[name] = value ?? null;
  }
  const flags = {};
  for (const name of names.flags) flags[name] = once(name) === true;
  return { values, flags };
}
