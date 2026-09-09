import type { Duck } from "../catalog/duck.js";
import type { Order, ShippingDetails } from "../checkout/order.js";

export interface CheckoutCartLine {
  readonly duckId: string;
  readonly quantity: number;
}

export interface CheckoutRequest {
  readonly shipping: ShippingDetails;
  readonly lines: readonly CheckoutCartLine[];
}

export interface StockShortage {
  readonly duckId: string;
  readonly duckName: string;
  readonly requested: number;
  readonly available: number;
}

export type CheckoutResult =
  | { readonly ok: true; readonly order: Order }
  | { readonly ok: false; readonly shortages: readonly StockShortage[] };

export interface CatalogRepository {
  listDucks(): Duck[];
  findDuckById(id: string): Duck | undefined;
  close(): void;
}

export interface EmporiumRepository extends CatalogRepository {
  checkout(request: CheckoutRequest): CheckoutResult;
  findOrderById(id: string): Order | undefined;
}
