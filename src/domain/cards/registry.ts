import type { CardId } from '../deck';
import type { AnyCardDefinition } from './types';

export class CardRegistry {
  private defs = new Map<CardId, AnyCardDefinition>();

  register(def: AnyCardDefinition): void {
    if (this.defs.has(def.id)) {
      throw new Error(`Card already registered: ${def.id}`);
    }
    this.defs.set(def.id, def);
  }

  get(id: CardId): AnyCardDefinition | undefined {
    return this.defs.get(id);
  }

  require(id: CardId): AnyCardDefinition {
    const def = this.get(id);
    if (!def) throw new Error(`Unknown card id: ${id}`);
    return def;
  }

  list(): AnyCardDefinition[] {
    return Array.from(this.defs.values());
  }

  /** Return a lightweight map for UI: id -> meta */
  getMetaMap(): Record<CardId, AnyCardDefinition['meta']> {
    const out: Record<CardId, AnyCardDefinition['meta']> = {} as Record<
      CardId,
      AnyCardDefinition['meta']
    >;
    for (const [id, def] of this.defs) out[id] = def.meta;
    return out;
  }
}

export const DefaultCardRegistry = new CardRegistry();
