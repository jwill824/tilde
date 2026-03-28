import { z } from 'zod';

const SECRET_PATTERN = /^(ghp_|sk-|AKIA|xox[bp]-)/;

const EnvVarReferenceSchema = z.object({
  key: z.string().min(1),
  value: z.string().refine(
    (v) => !SECRET_PATTERN.test(v),
    { message: 'envVar value must be a backend reference, not a resolved secret' }
  ),
});

const GitIdentitySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const GitHubAccountSchema = z.object({
  username: z.string().min(1),
});

const DeveloperContextSchema = z.object({
  label: z.string().min(1),
  path: z.string().min(1),
  git: GitIdentitySchema,
  github: GitHubAccountSchema.optional(),
  authMethod: z.enum(['gh-cli', 'https', 'ssh']),
  envVars: z.array(EnvVarReferenceSchema).optional().default([]),
  vscodeProfile: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const VersionManagerChoiceSchema = z.object({
  name: z.enum(['vfox', 'nvm', 'pyenv', 'sdkman']),
});

const LanguageChoiceSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  manager: z.string().min(1),
});

const ConfigurationDomainsSchema = z.object({
  git: z.boolean(),
  vscode: z.boolean(),
  aliases: z.boolean(),
  osDefaults: z.boolean(),
  direnv: z.boolean(),
});

const TildeConfigSchema = z.object({
  $schema: z.string().default('https://tilde.sh/config-schema/v1.json'),
  version: z.literal('1').default('1'),
  os: z.literal('macos').default('macos'),
  shell: z.enum(['zsh', 'bash', 'fish']),
  packageManager: z.literal('homebrew').default('homebrew'),
  versionManagers: z.array(VersionManagerChoiceSchema).default([]),
  languages: z.array(LanguageChoiceSchema).default([]),
  workspaceRoot: z.string().min(1),
  dotfilesRepo: z.string().refine(
    (v) => v.startsWith('/') || v.startsWith('~/'),
    { message: 'dotfilesRepo must be an absolute path or start with ~/' }
  ),
  contexts: z.array(DeveloperContextSchema).min(1),
  tools: z.array(z.string()).default([]),
  configurations: ConfigurationDomainsSchema,
  accounts: z.array(z.object({
    service: z.string().min(1),
    identifier: z.string().min(1),
    secretRef: z.string().optional(),
  })).optional().default([]),
  secretsBackend: z.enum(['1password', 'keychain', 'env-only']),
}).superRefine((config, ctx) => {
  // Validate context label uniqueness
  const labels = config.contexts.map(c => c.label);
  const seen = new Set<string>();
  labels.forEach((label, idx) => {
    if (seen.has(label)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate context label: "${label}"`,
        path: ['contexts', idx, 'label'],
      });
    }
    seen.add(label);
  });

  // Validate languages[].manager references a valid versionManager
  config.languages.forEach((lang, idx) => {
    const managerNames = config.versionManagers.map(vm => vm.name);
    if (!managerNames.includes(lang.manager as 'vfox' | 'nvm' | 'pyenv' | 'sdkman')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `languages[${idx}].manager "${lang.manager}" does not match any versionManager`,
        path: ['languages', idx, 'manager'],
      });
    }
  });
});

export { TildeConfigSchema, DeveloperContextSchema };
export type TildeConfig = z.infer<typeof TildeConfigSchema>;
export type DeveloperContext = z.infer<typeof DeveloperContextSchema>;
export type VersionManagerChoice = z.infer<typeof VersionManagerChoiceSchema>;
export type LanguageChoice = z.infer<typeof LanguageChoiceSchema>;
export type ConfigurationDomains = z.infer<typeof ConfigurationDomainsSchema>;
