import { execa, ExecaError } from 'execa';
import { PluginError } from '../plugins/api.js';

export type ExecOptions = {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export async function run(
  file: string,
  args: string[],
  opts?: ExecOptions
): Promise<ExecResult> {
  try {
    const result = await execa(file, args, {
      cwd: opts?.cwd,
      env: opts?.env ? { ...process.env, ...opts.env } : process.env,
      timeout: opts?.timeout,
      reject: true,
    });
    return {
      stdout: result.stdout as string,
      stderr: result.stderr as string,
      exitCode: result.exitCode ?? 0,
    };
  } catch (err) {
    if (err instanceof ExecaError) {
      throw new PluginError(
        file,
        `Command failed: ${file} ${args.join(' ')}\n${err.stderr || err.message}`,
        'EXEC_FAILED',
        err
      );
    }
    throw err;
  }
}

export async function runWithRetry(
  file: string,
  args: string[],
  maxRetries: number = 3,
  opts?: ExecOptions
): Promise<ExecResult> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await run(file, args, opts);
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
