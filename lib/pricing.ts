/** GBP integer pence. UI estimates never replace the server's checkout price. */
export const PLATFORM_FEE_PERCENT = 10;
export function bundlePrice(pricePence: number, quantity: number) {
  if (
    !Number.isSafeInteger(pricePence) ||
    pricePence < 100 ||
    pricePence > 100000 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  )
    return null;
  const fee = Math.round((pricePence * PLATFORM_FEE_PERCENT) / 100);
  return {
    total: pricePence,
    fee,
    seller: pricePence - fee,
    perPiece: pricePence / quantity,
  };
}
export function poundsToPence(value: string) {
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(Number(value) * 100);
}
export const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    pence / 100,
  );
