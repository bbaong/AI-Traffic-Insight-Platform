export const CUSTOMERS_SELECTION_KEY = 'ins_customers_selection_v1';

export type CustomersSelection = {
  customerId: string;
  consultationId?: string;
};

export function readCustomersSelection(): CustomersSelection | null {
  try {
    const raw = sessionStorage.getItem(CUSTOMERS_SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomersSelection;
    return parsed.customerId ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCustomersSelection(sel: CustomersSelection) {
  sessionStorage.setItem(CUSTOMERS_SELECTION_KEY, JSON.stringify(sel));
}