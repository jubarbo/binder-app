/**
 * Core domain types for the Tactile Binder.
 *
 * The oracle/printing split is intentional and must be preserved: a want is
 * expressed at the oracle level (a logical card), while a binder entry always
 * references the exact physical printing the user holds. Future matching
 * (users who have / want a card) depends on this split.
 */

/** A logical card, independent of any particular printing or set. */
export interface OracleCard {
  oracleId: string
  name: string
  manaCost?: string
  cmc: number
  colors: string[]
  typeLine: string
  oracleText?: string
  /** Representative image of the latest / default printing. */
  imageNormal?: string
}

/** A physical, purchasable card printing (mirrors a Scryfall card object). */
export interface Printing {
  /** Scryfall printing id — identifies the physical card. */
  id: string
  /** Logical card this printing belongs to. */
  oracleId: string
  setCode: string
  setName: string
  collectorNumber: string
  rarity: string
  /** Available finishes, e.g. `["nonfoil", "foil"]`. */
  finishes: string[]
  imageSmall: string
  imageNormal: string
  imageLarge: string
  prices?: {
    usd?: string
    usdFoil?: string
  }
}

/** Physical condition grading for a held card. */
export type Condition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'

/** A physical card the user owns and keeps in their binder. */
export interface BinderEntry {
  id: string
  /** References the physical printing (see `Printing.id`). */
  printingId: string
  quantity: number
  condition: Condition
  language: string
  forTrade: boolean
}

/** Priority ranking for a wanted card. */
export type WantPriority = 'low' | 'normal' | 'high'

/** A logical card the user wants; the printing preference is optional. */
export interface WantEntry {
  id: string
  /** References the logical card (see `OracleCard.oracleId`). */
  oracleId: string
  /**
   * Oracle-level display snapshot taken when the want was added. Optional:
   * wants stored before the snapshot existed render from `oracleId` alone.
   * There is no "card by oracle id" endpoint, so the list cannot resolve
   * these fields later.
   */
  name?: string
  typeLine?: string
  /** Representative image of the default printing (see `OracleCard`). */
  imageNormal?: string
  preferredPrintingId?: string
  /**
   * Human-readable snapshot of the preferred printing (set and collector
   * number), taken at add time: the list labels the want without resolving
   * the printing id.
   */
  printingLabel?: string
  quantity: number
  priority: WantPriority
}
