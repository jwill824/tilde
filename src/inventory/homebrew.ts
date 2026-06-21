export type HomebrewRequestStatus = 'direct' | 'dependency' | 'unknown';

export interface ClassifiedHomebrewFormula {
  id: string;
  requestStatus: HomebrewRequestStatus;
}

export interface ClassifiedHomebrewCask {
  id: string;
  requestStatus: Extract<HomebrewRequestStatus, 'direct'>;
}

export interface ClassifyHomebrewInventoryOptions {
  formulae: string[];
  casks: string[];
  installedOnRequestFormulae: string[];
  requestStatusAvailable: boolean;
}

export interface ClassifiedHomebrewInventory {
  formulae: ClassifiedHomebrewFormula[];
  casks: ClassifiedHomebrewCask[];
}

export function classifyHomebrewInventory(options: ClassifyHomebrewInventoryOptions): ClassifiedHomebrewInventory {
  const requestedFormulae = new Set(options.installedOnRequestFormulae);

  return {
    formulae: options.formulae.map(formula => ({
      id: formula,
      requestStatus: options.requestStatusAvailable
        ? requestedFormulae.has(formula) ? 'direct' : 'dependency'
        : 'unknown',
    })),
    casks: options.casks.map(cask => ({
      id: cask,
      requestStatus: 'direct',
    })),
  };
}
