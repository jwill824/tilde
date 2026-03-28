import type { TildePlugin, PluginCategory } from './api.js';

export class PluginRegistry {
  private plugins: Map<string, TildePlugin> = new Map();

  register(plugin: TildePlugin): void {
    const key = `${plugin.category}:${plugin.id}`;
    this.plugins.set(key, plugin);
  }

  get<T extends TildePlugin>(category: PluginCategory, id: string): T | undefined {
    const key = `${category}:${id}`;
    return this.plugins.get(key) as T | undefined;
  }

  getAll(category: PluginCategory): TildePlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.category === category);
  }

  getFirst<T extends TildePlugin>(category: PluginCategory): T | undefined {
    return this.getAll(category)[0] as T | undefined;
  }
}

export const pluginRegistry = new PluginRegistry();

// Register first-party plugins at module load time
import homebrewPlugin from './first-party/homebrew/index.js';
import ghCliPlugin from './first-party/gh-cli/index.js';
import onePasswordPlugin from './first-party/onepassword/index.js';
import direnvPlugin from './first-party/direnv/index.js';
import vfoxPlugin from './first-party/vfox/index.js';
import httpsPlugin from './first-party/https/index.js';
import sshPlugin from './first-party/ssh/index.js';

pluginRegistry.register(homebrewPlugin);
pluginRegistry.register(ghCliPlugin);
pluginRegistry.register(onePasswordPlugin);
pluginRegistry.register(direnvPlugin);
pluginRegistry.register(vfoxPlugin);
pluginRegistry.register(httpsPlugin);
pluginRegistry.register(sshPlugin);
