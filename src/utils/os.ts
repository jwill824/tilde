import { platform, arch } from 'node:os';

export type OS = 'macos' | 'windows' | 'linux';
export type Arch = 'arm64' | 'x64';

export function detectOS(): OS {
  const p = platform();
  if (p === 'darwin') return 'macos';
  if (p === 'win32') return 'windows';
  return 'linux';
}

export function detectArch(): Arch {
  const a = arch();
  if (a === 'arm64') return 'arm64';
  return 'x64';
}

export function assertMacOS(): void {
  const os = detectOS();
  if (os !== 'macos') {
    throw new Error(
      `tilde requires macOS (darwin). Detected OS: ${os}.\n` +
      'Windows and Linux support is planned for a future release.'
    );
  }
}
