const SECRET_VALUE_PATTERN = /^(ghp_|sk-|AKIA|op:\/\/)/;

export function parseZshrc(content: string): {
  aliases: Record<string, string>;
  exports: Record<string, string>;
  sourcedFiles: string[];
} {
  const aliases: Record<string, string> = {};
  const exports: Record<string, string> = {};
  const sourcedFiles: string[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse aliases: alias foo='bar' or alias foo=bar
    const aliasMatch = trimmed.match(/^alias\s+([^=\s]+)=(.+)$/);
    if (aliasMatch) {
      const key = aliasMatch[1].trim();
      let value = aliasMatch[2].trim();
      value = value.replace(/^(['"])(.*)\1$/, '$2');
      aliases[key] = value;
      continue;
    }

    // Parse exports: export VAR=val
    const exportMatch = trimmed.match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (exportMatch) {
      const key = exportMatch[1];
      const raw = exportMatch[2].trim();
      const value = raw.replace(/^(['"])(.*)\1$/, '$2');
      if (!SECRET_VALUE_PATTERN.test(value)) {
        exports[key] = value;
      }
      continue;
    }

    // Parse source / . lines
    const sourceMatch = trimmed.match(/^(?:source|\.)\s+(.+)$/);
    if (sourceMatch) {
      let src = sourceMatch[1].trim();
      src = src.replace(/^(['"])(.*)\1$/, '$2');
      sourcedFiles.push(src);
    }
  }

  return { aliases, exports, sourcedFiles };
}

export function parseGitconfig(content: string): { name?: string; email?: string } {
  let inUserSection = false;
  let name: string | undefined;
  let email: string | undefined;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[')) {
      inUserSection = /^\[user\]/i.test(trimmed);
      continue;
    }

    if (!inUserSection) continue;

    const nameMatch = trimmed.match(/^name\s*=\s*(.+)$/);
    if (nameMatch) {
      name = nameMatch[1].trim();
      continue;
    }

    const emailMatch = trimmed.match(/^email\s*=\s*(.+)$/);
    if (emailMatch) {
      email = emailMatch[1].trim();
    }
  }

  return { name, email };
}

export function parseGitconfigIncludes(content: string): string[] {
  const paths: string[] = [];
  let inIncludeSection = false;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[')) {
      inIncludeSection = /^\[includeIf\b/i.test(trimmed);
      continue;
    }

    if (!inIncludeSection) continue;

    const pathMatch = trimmed.match(/^path\s*=\s*(.+)$/);
    if (pathMatch) {
      paths.push(pathMatch[1].trim());
    }
  }

  return paths;
}
