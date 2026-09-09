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

export interface CreateDuckRequest {
  readonly name: string;
  readonly category: string;
  readonly price: number;
  readonly tagline: string;
  readonly description: string;
  readonly personalityTraits: readonly string[];
  readonly specialPowers: readonly string[];
  readonly stock: number;
}

export type CreateDuckResult =
  | { readonly ok: true; readonly duck: Duck }
  | { readonly ok: false; readonly reason: "duplicate-name" };

export interface CatalogRepository {
  listDucks(): Duck[];
  findDuckById(id: string): Duck | undefined;
  close(): void;
}

export interface EmporiumRepository extends CatalogRepository {
  createDuck(request: CreateDuckRequest): CreateDuckResult;
  checkout(request: CheckoutRequest): CheckoutResult;
  findOrderById(id: string): Order | undefined;
}
