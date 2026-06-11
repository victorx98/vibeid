export type ProductTier = 'basic' | 'premium'

export const PRODUCT_TIERS: ProductTier[] = ['basic', 'premium']

export const TIERS_FOR_PRODUCT: Record<ProductTier, ProductTier[]> = {
  basic: ['basic'],
  premium: ['basic', 'premium'],
}

export function isProductTier(value: unknown): value is ProductTier {
  return typeof value === 'string' && PRODUCT_TIERS.includes(value as ProductTier)
}
