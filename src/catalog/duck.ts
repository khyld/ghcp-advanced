export interface Duck {
  id: string;
  name: string;
  category: string;
  price: number;
  tagline: string;
  description: string;
  personalityTraits: string[];
  specialPowers: string[];
  stock: number;
}

function describeEntry(index: number, field?: string): string {
  return field === undefined
    ? `Catalog entry ${index}`
    : `Catalog entry ${index}, field "${field}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
  index: number,
  singleLine = false,
): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${describeEntry(index, field)} must be a non-empty string`);
  }
  if (singleLine && /[\r\n]/u.test(value)) {
    throw new TypeError(`${describeEntry(index, field)} must be a single line`);
  }
  return value;
}

function requiredStringArray(
  record: Record<string, unknown>,
  field: string,
  index: number,
): string[] {
  const value = record[field];
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${describeEntry(index, field)} must be a non-empty array`);
  }

  return value.map((item, itemIndex) => {
    const itemField = `${field}[${String(itemIndex)}]`;
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new TypeError(
        `${describeEntry(index, itemField)} must be a non-empty string`,
      );
    }
    if (/[\r\n]/u.test(item)) {
      throw new TypeError(`${describeEntry(index, itemField)} must be a single line`);
    }
    return item;
  });
}

function parseDuck(value: unknown, index: number): Duck {
  if (!isRecord(value)) {
    throw new TypeError(`${describeEntry(index)} must be an object`);
  }

  const id = requiredString(value, "id", index);
  const name = requiredString(value, "name", index);
  const category = requiredString(value, "category", index);
  const tagline = requiredString(value, "tagline", index, true);
  const description = requiredString(value, "description", index);
  const personalityTraits = requiredStringArray(value, "personalityTraits", index);
  const specialPowers = requiredStringArray(value, "specialPowers", index);

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

  const stock = value.stock;
  if (typeof stock !== "number" || !Number.isFinite(stock) || !Number.isInteger(stock)) {
    throw new TypeError(`${describeEntry(index, "stock")} must be a finite integer`);
  }
  if (stock < 0) {
    throw new RangeError(`${describeEntry(index, "stock")} must not be negative`);
  }

  return {
    id,
    name,
    category,
    price,
    tagline,
    description,
    personalityTraits,
    specialPowers,
    stock,
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
