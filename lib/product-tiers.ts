export type ProductTier = 'basic' | 'resume'

export const PRODUCT_TIERS: ProductTier[] = ['basic', 'resume']

export const TIERS_FOR_PRODUCT: Record<ProductTier, ProductTier[]> = {
  basic: ['basic'],
  resume: ['basic', 'resume'],
}

export function isProductTier(value: unknown): value is ProductTier {
  return typeof value === 'string' && PRODUCT_TIERS.includes(value as ProductTier)
}
