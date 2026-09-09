export interface ShippingDetails {
  readonly name: string;
  readonly email: string;
  readonly address: string;
}

export interface OrderLine {
  readonly position: number;
  readonly duckId: string;
  readonly duckName: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
}

export interface Order {
  readonly id: string;
  readonly createdAt: string;
  readonly shipping: ShippingDetails;
  readonly lines: readonly OrderLine[];
  readonly totalCents: number;
}
