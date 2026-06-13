import { z } from 'zod';

const HomebrewIdentifierSchema = z.string()
  .min(1)
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/@+-]*$/, 'Homebrew identifier contains unsupported characters');

const NonBlankStringSchema = z.string().min(1).refine(value => value.trim().length > 0, {
  message: 'Value must not be blank',
}).refine(value => !hasControlCharacter(value), {
  message: 'Value must not contain control characters',
});

function hasControlCharacter(value: string): boolean {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

export const PlatformSchema = z.enum(['darwin', 'linux', 'win32']);

export const ToolCategorySchema = z.enum([
  'package-manager',
  'secrets-backend',
  'account-connector',
  'env-loader',
  'version-manager',
  'browser',
  'editor',
  'ai-tool',
  'note-taking',
]);

export const ToolInstallSchema = z.object({
  homebrew: z.object({
    formula: HomebrewIdentifierSchema.optional(),
    cask: HomebrewIdentifierSchema.optional(),
  }).optional(),
  appPath: NonBlankStringSchema.optional(),
  manualNote: NonBlankStringSchema.optional(),
}).optional();

export const ToolExternalIdsSchema = z.object({
  defaultbrowser: NonBlankStringSchema.optional(),
}).catchall(NonBlankStringSchema).optional();

export const ToolMetadataSchema = z.object({
  id: NonBlankStringSchema,
  label: NonBlankStringSchema,
  category: ToolCategorySchema,
  supportedPlatforms: z.array(PlatformSchema).min(1),
  source: z.enum(['first-party', 'community', 'local']).default('first-party'),
  install: ToolInstallSchema,
  externalIds: ToolExternalIdsSchema,
  configPaths: z.array(NonBlankStringSchema).optional(),
  dotfilePaths: z.array(NonBlankStringSchema).optional(),
  variants: z.array(NonBlankStringSchema).optional(),
});

export const ToolMetadataArraySchema = z.array(ToolMetadataSchema).superRefine((tools, ctx) => {
  const seen = new Set<string>();

  tools.forEach((tool, index) => {
    if (seen.has(tool.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate tool metadata id: "${tool.id}"`,
        path: [index, 'id'],
      });
    }
    seen.add(tool.id);
  });
});

export type ToolPlatform = z.infer<typeof PlatformSchema>;
export type ToolCategory = z.infer<typeof ToolCategorySchema>;
export type ToolSource = 'first-party' | 'community' | 'local';
export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;

export function validateToolMetadata(metadata: unknown): ToolMetadata[] {
  const parsed = ToolMetadataArraySchema.safeParse(metadata);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid tool metadata: ${details}`);
  }

  return parsed.data;
}
