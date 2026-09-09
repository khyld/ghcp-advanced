import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { CartSessionStore } from "../src/cart/cart-session-store.js";
import { duckFixture } from "./fixtures/ducks.js";

const ducks = [
  duckFixture({
    id: "first",
    name: "First Duck",
    category: "Classic",
    price: 12.99,
    tagline: "First in the catalog.",
  }),
  duckFixture({
    id: "second",
    name: "Second Duck",
    category: "Adventure",
    price: 15,
    tagline: "Second in the catalog.",
    description: "The other duck's private details.",
  }),
  duckFixture({
    id: "duck/with space",
    name: "Encoded Duck",
  }),
  duckFixture({
    id: "sold-out",
    name: "Sold Out Duck",
    stock: 0,
  }),
];

describe("GET /", () => {
  it("returns the complete linked HTML catalog in order", async () => {
    const response = await request(createApp(ducks)).get("/").expect(200);

    expect(response.headers["content-type"]).toMatch(/^text\/html; charset=utf-8$/u);
    expect(response.text).toContain("First Duck");
    expect(response.text).toContain("Classic");
    expect(response.text).toContain("€12.99");
    expect(response.text).toContain("First in the catalog.");
    expect(response.text).toContain('href="/ducks/first"');
    expect(response.text.indexOf("First Duck")).toBeLessThan(
      response.text.indexOf("Second Duck"),
    );
  });

  it("returns the empty state without a list or detail links", async () => {
    const response = await request(createApp([])).get("/").expect(200);

    expect(response.text).toContain("No ducks are currently available.");
    expect(response.text).not.toContain("<ul>");
    expect(response.text).not.toContain("/ducks/");
  });
});

describe("GET /ducks/:id", () => {
  it("returns complete details for an exact ID", async () => {
    const response = await request(createApp(ducks)).get("/ducks/first").expect(200);

    expect(response.headers["content-type"]).toMatch(/^text\/html; charset=utf-8$/u);
    for (const content of [
      "First Duck",
      "Classic",
      "€12.99",
      "First in the catalog.",
      ducks[0]?.description,
      "Cheerful",
      "Perfect buoyancy",
      "In stock",
    ]) {
      expect(response.text).toContain(content);
    }
    expect(response.text).not.toContain("The other duck's private details.");
  });

  it("resolves a URL-encoded exact ID", async () => {
    const response = await request(createApp(ducks))
      .get("/ducks/duck%2Fwith%20space")
      .expect(200);

    expect(response.text).toContain("Encoded Duck");
  });

  it.each(["missing-duck", "fir", "FIRST"])(
    "returns a friendly 404 for unmatched ID %s",
    async (id) => {
      const response = await request(createApp(ducks))
        .get(`/ducks/${id}`)
        .expect(404);

      expect(response.headers["content-type"]).toMatch(/^text\/html; charset=utf-8$/u);
      expect(response.text).toContain("Duck not found");
      expect(response.text).toContain('href="/"');
      expect(response.text).not.toContain(id);
    },
  );
});

describe("cart routes", () => {
  it("supports add, repeated add, update, zero-removal, and explicit removal", async () => {
    const agent = request.agent(createApp(ducks));

    await agent.post("/cart/items").type("form").send({ duckId: "first" }).expect(303);
    await agent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "first", quantity: "2" })
      .expect(303);
    await agent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "second", quantity: "1" })
      .expect(303);

    let response = await agent.get("/cart").expect(200);
    expect(response.text).toContain("<strong>Quantity:</strong> 3");
    expect(response.text.match(/First Duck/gu)).not.toBeNull();
    expect(response.text.indexOf("First Duck")).toBeLessThan(
      response.text.indexOf("Second Duck"),
    );

    await agent
      .post("/cart/items/first")
      .type("form")
      .send({ quantity: "2" })
      .expect(303);
    await agent.post("/cart/items/second/remove").type("form").send({}).expect(303);

    response = await agent.get("/cart").expect(200);
    expect(response.text).toContain("<strong>Quantity:</strong> 2");
    expect(response.text).not.toContain("Second Duck");

    await agent
      .post("/cart/items/first")
      .type("form")
      .send({ quantity: "0" })
      .expect(303);
    response = await agent.get("/cart").expect(200);
    expect(response.text).toContain("Your cart is empty.");
  });

  it("rejects over-stock and sold-out adds atomically with one-time messages", async () => {
    const agent = request.agent(createApp(ducks));
    await agent.post("/cart/items").type("form").send({ duckId: "first" }).expect(303);

    await agent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "first", quantity: "3" })
      .expect(303);
    let response = await agent.get("/cart").expect(200);
    expect(response.text).toContain(
      "First Duck has a maximum available quantity of 3.",
    );
    expect(response.text).toContain("<strong>Quantity:</strong> 1");

    response = await agent.get("/cart").expect(200);
    expect(response.text).not.toContain(
      "First Duck has a maximum available quantity of 3.",
    );

    await agent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "sold-out" })
      .expect(303);
    response = await agent.get("/cart").expect(200);
    expect(response.text).toContain(
      "Sold Out Duck has a maximum available quantity of 0.",
    );
    expect(response.text).not.toContain('href="/ducks/sold-out"');
  });

  it("rejects invalid and unknown input without trusting submitted display data", async () => {
    const agent = request.agent(createApp(ducks));

    await agent
      .post("/cart/items")
      .type("form")
      .send({
        duckId: "first",
        quantity: "1",
        name: "Forged Name",
        price: "0.01",
      })
      .expect(303);
    let response = await agent.get("/cart").expect(200);
    expect(response.text).toContain("First Duck");
    expect(response.text).toContain("€12.99");
    expect(response.text).not.toContain("Forged Name");
    expect(response.text).not.toContain("€0.01");

    await agent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "missing", quantity: "1" })
      .expect(303);
    response = await agent.get("/cart").expect(200);
    expect(response.text).toContain("Choose a valid duck.");
    expect(response.text).toContain("<strong>Quantity:</strong> 1");

    await agent
      .post("/cart/items/first")
      .type("form")
      .send({ quantity: "1.5" })
      .expect(303);
    response = await agent.get("/cart").expect(200);
    expect(response.text).toContain(
      "Quantity must be zero or a positive whole number.",
    );
    expect(response.text).toContain("<strong>Quantity:</strong> 1");
  });

  it("keeps carts isolated between agents", async () => {
    const app = createApp(ducks);
    const firstAgent = request.agent(app);
    const secondAgent = request.agent(app);

    await firstAgent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "first" })
      .expect(303);

    expect((await firstAgent.get("/cart").expect(200)).text).toContain("First Duck");
    expect((await secondAgent.get("/cart").expect(200)).text).toContain(
      "Your cart is empty.",
    );
  });

  it("expires inactive sessions while activity extends their deadline", async () => {
    let now = 0;
    const ids = [
      "123e4567-e89b-42d3-a456-426614174000",
      "123e4567-e89b-42d3-a456-426614174001",
    ];
    const store = new CartSessionStore({
      now: () => now,
      generateId: () => ids.shift() ?? "123e4567-e89b-42d3-a456-426614174002",
      inactivityMs: 100,
    });
    const agent = request.agent(createApp(ducks, { sessionStore: store }));

    await agent.get("/cart").expect(200);
    await agent.post("/cart/items").type("form").send({ duckId: "first" }).expect(303);

    now = 50;
    expect((await agent.get("/cart").expect(200)).text).toContain("First Duck");
    now = 120;
    expect((await agent.get("/cart").expect(200)).text).toContain("First Duck");
    now = 221;
    const expiredResponse = await agent.get("/cart").expect(200);

    expect(expiredResponse.text).toContain("Your cart is empty.");
    expect(expiredResponse.headers["set-cookie"]?.[0]).toContain(
      "123e4567-e89b-42d3-a456-426614174001",
    );
  });

  it("sets a non-persistent secure-by-context session cookie", async () => {
    const response = await request(createApp(ducks)).get("/cart").expect(200);
    const cookie = response.headers["set-cookie"]?.[0] ?? "";

    expect(cookie).toContain("duck_cart_session=");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toMatch(/Expires=|Max-Age=/iu);
  });
});
