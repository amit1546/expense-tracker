// A link like  <artifact url>#pay-45.50-Shufersal_City  opens the add-expense form with the amount and the shop filled in.
// The viewer only passes a plain #anchor (letters, digits and . _ ~ -) to the page, so that is all the format can use.
// Merchant words are joined with "_" (or "-" after the amount). Nothing is ever saved from a link; it only fills the form.
const PAY = /^#pay-(\d+(?:[.,]\d{1,2})?)(?:-(.+))?$/i;

export function parsePayHash(hash) {
  const m = PAY.exec(hash ?? '');
  if (!m) return null;
  const amount = Number(m[1].replace(',', '.'));
  if (!(amount > 0)) return null;
  let merchant = m[2] ?? '';
  try {
    merchant = decodeURIComponent(merchant);
  } catch {
    // keep the text as it came
  }
  merchant = merchant.replace(/[_+]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  return { amount: String(amount), merchant };
}

// The category of the latest expense with the same description, if there was one.
export function categoryForMerchant(expenses, merchant) {
  const key = merchant.trim().toLowerCase();
  if (!key) return undefined;
  let best;
  for (const e of expenses) {
    if (e.description.trim().toLowerCase() === key && (!best || e.date >= best.date)) best = e;
  }
  return best?.category;
}
