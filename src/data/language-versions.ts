export interface LanguageCatalogEntry {
  label: string;
  versions: string[];
  managers: string[];
}

export const LANGUAGE_CATALOG: Record<string, LanguageCatalogEntry> = {
  node: {
    label: 'Node.js',
    versions: ['22 (LTS)', '20 (LTS)', '18', '16'],
    managers: ['nvm', 'fnm', 'vfox'],
  },
  python: {
    label: 'Python',
    versions: ['3.12', '3.11', '3.10', '3.9', '3.8'],
    managers: ['pyenv', 'vfox'],
  },
  java: {
    label: 'Java',
    versions: ['21 (LTS)', '17 (LTS)', '11', '8'],
    managers: ['sdkman', 'vfox'],
  },
  go: {
    label: 'Go',
    versions: ['1.22', '1.21', '1.20', '1.19'],
    managers: ['vfox'],
  },
  ruby: {
    label: 'Ruby',
    versions: ['3.3', '3.2', '3.1', '2.7'],
    managers: ['rbenv', 'rvm', 'vfox'],
  },
  kotlin: {
    label: 'Kotlin',
    versions: ['2.0', '1.9', '1.8'],
    managers: ['sdkman', 'vfox'],
  },
  scala: {
    label: 'Scala',
    versions: ['3.4', '3.3', '2.13', '2.12'],
    managers: ['sdkman', 'vfox'],
  },
  rust: {
    label: 'Rust',
    versions: ['stable', 'beta', 'nightly'],
    managers: ['rustup', 'vfox'],
  },
};

export const LANGUAGE_KEYS = Object.keys(LANGUAGE_CATALOG);

export const VERSION_MANAGER_DIRENV_STRATEGY: Record<string, string> = {
  vfox: 'use vfox in .envrc (direnv)',
  nvm: '.nvmrc file per context',
  fnm: '.node-version file per context',
  pyenv: '.python-version file per context',
  sdkman: '.sdkmanrc file per context',
  rbenv: '.ruby-version file per context',
  rvm: '.ruby-version file per context',
  rustup: 'rust-toolchain.toml per context',
};
