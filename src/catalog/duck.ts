export interface Duck {
  id: string;
  name: string;
  category: string;
  price: number;
  tagline: string;
}

const requiredStringFields = ["id", "name", "category", "tagline"] as const;

function describeEntry(index: number, field?: string): string {
  return field === undefined
    ? `Catalog entry ${index}`
    : `Catalog entry ${index}, field "${field}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDuck(value: unknown, index: number): Duck {
  if (!isRecord(value)) {
    throw new TypeError(`${describeEntry(index)} must be an object`);
  }

  for (const field of requiredStringFields) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new TypeError(`${describeEntry(index, field)} must be a non-empty string`);
    }
  }

  const tagline = value.tagline as string;
  if (/[\r\n]/u.test(tagline)) {
    throw new TypeError(`${describeEntry(index, "tagline")} must be a single line`);
  }

  const price = value.price;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    throw new TypeError(`${describeEntry(index, "price")} must be a finite number`);
  }
  if (price < 0) {
    throw new RangeError(`${describeEntry(index, "price")} must not be negative`);
  }
  if (Math.round(price * 100) / 100 !== price) {
    throw new RangeError(
      `${describeEntry(index, "price")} must have no more than two decimal places`,
    );
  }

  return {
    id: value.id as string,
    name: value.name as string,
    category: value.category as string,
    price,
    tagline,
  };
}

export function parseCatalog(value: unknown): Duck[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Catalog must be an array");
  }

  const seenIds = new Set<string>();

  return value.map((entry, index) => {
    const duck = parseDuck(entry, index);
    if (seenIds.has(duck.id)) {
      throw new TypeError(`${describeEntry(index, "id")} duplicates "${duck.id}"`);
    }
    seenIds.add(duck.id);
    return duck;
  });
}
