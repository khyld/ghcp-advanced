import request from "supertest";
import { describe, expect, it } from "vitest";

import { CartSessionStore } from "../src/cart/cart-session-store.js";
import { duckFixture } from "./fixtures/ducks.js";
import {
  createTestApp as createApp,
  TEST_ADMIN_PASSWORD,
} from "./helpers/test-app.js";
import { createTestRepository } from "./helpers/test-repository.js";

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
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/")
      .expect(200);

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
    const response = await request(createApp(createTestRepository([]))).get("/").expect(200);

    expect(response.text).toContain("No ducks are currently available.");
    expect(response.text).not.toContain("<ul>");
    expect(response.text).not.toContain("/ducks/");
  });

  it.each([
    ["name", "FIRST DUCK", "First Duck"],
    ["tagline", "second in the catalog", "Second Duck"],
    ["description", "other duck's private details", "Second Duck"],
  ])(
    "filters by a complete case-insensitive phrase in the %s",
    async (_field, query, expected) => {
      const response = await request(createApp(createTestRepository(ducks)))
        .get("/")
        .query({ q: query })
        .expect(200);

      expect(response.text).toContain(expected);
      expect(response.text).toContain(`value="${query.replace("'", "&#39;")}"`);
    },
  );

  it("composes repeated categories and inclusive price bounds in stable order", async () => {
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/")
      .query({
        q: "catalog",
        category: ["Adventure", "Classic"],
        minPrice: "12.99",
        maxPrice: "15.00",
      })
      .expect(200);

    expect(response.text).toContain("First Duck");
    expect(response.text).toContain("Second Duck");
    expect(response.text.indexOf("First Duck")).toBeLessThan(
      response.text.indexOf("Second Duck"),
    );
    expect(response.text).toContain('value="Classic" checked');
    expect(response.text).toContain('value="Adventure" checked');
    expect(response.text).toContain('name="minPrice" inputmode="decimal" value="12.99"');
    expect(response.text).toContain('name="maxPrice" inputmode="decimal" value="15.00"');
  });

  it("renders the friendly filtered empty state for unknown categories", async () => {
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/")
      .query({ category: "Existential" })
      .expect(200);

    expect(response.text).toContain("No duck matches your existential criteria.");
    expect(response.text).toContain(
      '<input type="hidden" name="category" value="Existential">',
    );
    expect(response.text).not.toContain("<article>");
  });

  it("returns every scalar validation error with no duck results", async () => {
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/?q=First&q=Second&minPrice=30&maxPrice=20")
      .expect(400);

    expect(response.text).toContain("Enter one search phrase.");
    expect(response.text).toContain(
      "Maximum price must be greater than or equal to minimum price.",
    );
    expect(response.text).not.toContain("<article>");
    expect(response.text).not.toContain("First Duck");
  });

  it("escapes retained query values and does not create a cart session", async () => {
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/")
      .query({ q: '<script>"duck"</script>' })
      .expect(200);

    expect(response.text).toContain(
      'value="&lt;script&gt;&quot;duck&quot;&lt;/script&gt;"',
    );
    expect(response.text).not.toContain("<script>");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

describe("GET /ducks/:id", () => {
  it("returns complete details for an exact ID", async () => {
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/ducks/first")
      .expect(200);

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
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/ducks/duck%2Fwith%20space")
      .expect(200);

    expect(response.text).toContain("Encoded Duck");
  });

  it.each(["missing-duck", "fir", "FIRST"])(
    "returns a friendly 404 for unmatched ID %s",
    async (id) => {
      const response = await request(createApp(createTestRepository(ducks)))
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
    const agent = request.agent(createApp(createTestRepository(ducks)));

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
    const agent = request.agent(createApp(createTestRepository(ducks)));
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
    const agent = request.agent(createApp(createTestRepository(ducks)));

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
    const app = createApp(createTestRepository(ducks));
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
    const agent = request.agent(
      createApp(createTestRepository(ducks), { sessionStore: store }),
    );

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
    const response = await request(createApp(createTestRepository(ducks)))
      .get("/cart")
      .expect(200);
    const cookie = response.headers["set-cookie"]?.[0] ?? "";

    expect(cookie).toContain("duck_cart_session=");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toMatch(/Expires=|Max-Age=/iu);
  });
});

describe("checkout routes", () => {
  it("redirects empty checkout attempts and shows the message once", async () => {
    const agent = request.agent(createApp(createTestRepository(ducks)));

    await agent.get("/checkout").expect(303).expect("Location", "/cart");
    let response = await agent.get("/cart").expect(200);
    expect(response.text).toContain("Your cart is empty. Add a duck before checking out.");

    response = await agent.get("/cart").expect(200);
    expect(response.text).not.toContain(
      "Your cart is empty. Add a duck before checking out.",
    );

    await agent.post("/checkout").type("form").send({ cardNumber: "secret" }).expect(303);
  });

  it("renders checkout only for a non-empty cart", async () => {
    const agent = request.agent(createApp(createTestRepository(ducks)));
    await agent.post("/cart/items").type("form").send({ duckId: "first" }).expect(303);

    const cart = await agent.get("/cart").expect(200);
    expect(cart.text).toContain('href="/checkout"');

    const checkout = await agent.get("/checkout").expect(200);
    expect(checkout.text).toContain('form method="post" action="/checkout"');
    expect(checkout.text).toContain("First Duck");
    expect(checkout.text).toContain("€12.99");
    expect(checkout.text).not.toContain('name="total"');
  });

  it("returns every validation error without echoing payment data or clearing cart", async () => {
    const agent = request.agent(createApp(createTestRepository(ducks)));
    await agent.post("/cart/items").type("form").send({ duckId: "first" }).expect(303);

    const response = await agent
      .post("/checkout")
      .type("form")
      .send({
        shippingName: "Quincy",
        email: "invalid",
        shippingAddress: "1 Pond Lane",
        cardNumber: "4111-secret",
        expiry: " ",
        securityCode: "999-secret",
      })
      .expect(400);

    expect(response.text).toContain("Enter a valid email address.");
    expect(response.text).toContain("Enter a mocked expiry.");
    expect(response.text).not.toContain("4111-secret");
    expect(response.text).not.toContain("999-secret");
    expect((await agent.get("/cart").expect(200)).text).toContain("First Duck");
  });

  it("commits trusted order data, decrements stock, and clears only that session cart", async () => {
    const repository = createTestRepository(ducks);
    const app = createApp(repository);
    const customer = request.agent(app);
    const otherCustomer = request.agent(app);

    await customer
      .post("/cart/items")
      .type("form")
      .send({
        duckId: "first",
        quantity: "2",
        name: "Forged Duck",
        price: "0.01",
        total: "0.02",
      })
      .expect(303);
    await otherCustomer
      .post("/cart/items")
      .type("form")
      .send({ duckId: "second" })
      .expect(303);

    const response = await customer
      .post("/checkout")
      .type("form")
      .send({
        shippingName: " Quincy ",
        email: "Quincy@EXAMPLE.COM",
        shippingAddress: " 1 Pond Lane ",
        cardNumber: "mock-card-secret",
        expiry: "never",
        securityCode: "hidden",
        duckId: "second",
        price: "0.01",
        total: "0.01",
      })
      .expect(200);

    expect(response.text).toContain("Your order is confirmed!");
    expect(response.text).toContain("First Duck");
    expect(response.text).toContain("€25.98");
    expect(response.text).toContain("Quincy");
    expect(response.text).not.toContain("Forged Duck");
    expect(response.text).not.toContain("mock-card-secret");
    expect(response.text).not.toContain("hidden");
    expect(repository.findDuckById("first")?.stock).toBe(1);
    expect((await customer.get("/cart").expect(200)).text).toContain(
      "Your cart is empty.",
    );
    expect((await otherCustomer.get("/cart").expect(200)).text).toContain(
      "Second Duck",
    );
  });

  it("reports current stock shortages and retains the cart", async () => {
    const repository = createTestRepository(ducks);
    const agent = request.agent(createApp(repository));
    await agent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "first", quantity: "2" })
      .expect(303);

    const competingOrder = repository.checkout({
      shipping: {
        name: "Other Customer",
        email: "other@example.com",
        address: "2 Pond Lane",
      },
      lines: [{ duckId: "first", quantity: 2 }],
    });
    expect(competingOrder.ok).toBe(true);

    const response = await agent
      .post("/checkout")
      .type("form")
      .send({
        shippingName: "Quincy",
        email: "quincy@example.com",
        shippingAddress: "1 Pond Lane",
        cardNumber: "mock",
        expiry: "mock",
        securityCode: "mock",
      })
      .expect(400);

    expect(response.text).toContain("First Duck has 1 available; you requested 2.");
    expect((await agent.get("/cart").expect(200)).text).toContain(
      "<strong>Quantity:</strong> 2",
    );
  });

  it("returns a generic error and retains the cart when persistence throws", async () => {
    const repository = createTestRepository(ducks);
    const app = createApp({
      ...repository,
      listDucks: () => repository.listDucks(),
      findDuckById: (id) => repository.findDuckById(id),
      findOrderById: (id) => repository.findOrderById(id),
      close: () => repository.close(),
      checkout: () => {
        throw new Error("sensitive database detail");
      },
    });
    const agent = request.agent(app);
    const originalConsoleError = console.error;
    console.error = () => undefined;

    try {
      await agent.post("/cart/items").type("form").send({ duckId: "first" }).expect(303);
      const response = await agent
        .post("/checkout")
        .type("form")
        .send({
          shippingName: "Quincy",
          email: "quincy@example.com",
          shippingAddress: "1 Pond Lane",
          cardNumber: "card-secret",
          expiry: "expiry-secret",
          securityCode: "code-secret",
        })
        .expect(500);

      expect(response.text).toContain("We could not complete your request.");
      expect(response.text).not.toContain("sensitive database detail");
      expect(response.text).not.toContain("card-secret");
      expect((await agent.get("/cart").expect(200)).text).toContain("First Duck");
    } finally {
      console.error = originalConsoleError;
    }
  });
});

describe("POST /admin/ducks", () => {
  const validNewDuck = {
    name: " Doctor Drake ",
    category: " Professions ",
    price: 12.5,
    tagline: " Diagnoses difficult bugs. ",
    description: " A careful and thoughtful duck. ",
    personalityTraits: [" Patient ", " Precise "],
    specialPowers: [" Debug vision "],
    initialStock: 2,
  };

  it("authenticates before parsing and returns identical unauthorized responses", async () => {
    const app = createApp(createTestRepository(ducks));

    const missing = await request(app)
      .post("/admin/ducks")
      .set("Content-Type", "application/json")
      .send("{")
      .expect(401);
    const wrong = await request(app)
      .post("/admin/ducks")
      .set("Authorization", "Bearer wrong-password")
      .send(validNewDuck)
      .expect(401);

    expect(missing.body).toEqual({ error: "Unauthorized" });
    expect(wrong.body).toEqual(missing.body);
    expect(missing.headers["www-authenticate"]).toBe("Bearer");
    expect(wrong.headers["www-authenticate"]).toBe("Bearer");
  });

  it("returns safe JSON errors for media type, malformed JSON, and invalid fields", async () => {
    const app = createApp(createTestRepository(ducks));
    const authorization = `Bearer ${TEST_ADMIN_PASSWORD}`;

    expect(
      (
        await request(app)
          .post("/admin/ducks")
          .set("Authorization", authorization)
          .type("form")
          .send({ name: "Form Duck" })
          .expect(415)
      ).body,
    ).toEqual({ error: "Content-Type must be application/json." });

    expect(
      (
        await request(app)
          .post("/admin/ducks")
          .set("Authorization", authorization)
          .set("Content-Type", "application/json")
          .send("{")
          .expect(400)
      ).body,
    ).toEqual({ error: "Malformed JSON." });

    const invalid = await request(app)
      .post("/admin/ducks")
      .set("Authorization", authorization)
      .send({ name: "Incomplete Duck" })
      .expect(400);
    expect(invalid.body.error).toBe("Validation failed");
    expect(invalid.body.fields).toHaveProperty("category");
    expect(invalid.body.fields).toHaveProperty("price");
  });

  it("creates, logs, and immediately exposes a normalized persistent duck", async () => {
    const logs: string[] = [];
    const repository = createTestRepository(ducks, {
      generateDuckId: () => "123e4567-e89b-42d3-a456-426614174099",
    });
    const agent = request.agent(
      createApp(repository, {
        now: () => new Date("2026-09-09T19:30:00.000Z"),
        log: (message) => logs.push(message),
      }),
    );

    const response = await agent
      .post("/admin/ducks")
      .set("Authorization", `Bearer ${TEST_ADMIN_PASSWORD}`)
      .send(validNewDuck)
      .expect(201);

    expect(response.headers.location).toBe(
      "/ducks/123e4567-e89b-42d3-a456-426614174099",
    );
    expect(response.body).toEqual({
      id: "123e4567-e89b-42d3-a456-426614174099",
      name: "Doctor Drake",
      category: "Professions",
      price: 12.5,
      tagline: "Diagnoses difficult bugs.",
      description: "A careful and thoughtful duck.",
      personalityTraits: ["Patient", "Precise"],
      specialPowers: ["Debug vision"],
      stock: 2,
    });
    expect(logs).toEqual([
      '2026-09-09T19:30:00.000Z curator added duck "Doctor Drake"',
    ]);
    expect(logs.join(" ")).not.toContain(TEST_ADMIN_PASSWORD);

    expect(
      (await agent.get("/").query({ q: "thoughtful duck" }).expect(200)).text,
    ).toContain("Doctor Drake");
    expect(
      (
        await agent
          .get("/ducks/123e4567-e89b-42d3-a456-426614174099")
          .expect(200)
      ).text,
    ).toContain("Debug vision");
    await agent
      .post("/cart/items")
      .type("form")
      .send({ duckId: "123e4567-e89b-42d3-a456-426614174099" })
      .expect(303);
    expect((await agent.get("/cart").expect(200)).text).toContain("Doctor Drake");

    const duplicate = await agent
      .post("/admin/ducks")
      .set("Authorization", `Bearer ${TEST_ADMIN_PASSWORD}`)
      .send({ ...validNewDuck, name: "doctor drake" })
      .expect(409);
    expect(duplicate.body).toEqual({
      error: "A duck with that name already exists.",
      fields: { name: "Choose a unique duck name." },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects persistence-controlled fields without mutating the catalog", async () => {
    const repository = createTestRepository(ducks);
    const initialCount = repository.listDucks().length;
    const response = await request(createApp(repository))
      .post("/admin/ducks")
      .set("Authorization", `Bearer ${TEST_ADMIN_PASSWORD}`)
      .send({ ...validNewDuck, id: "client-controlled", stock: 99 })
      .expect(400);

    expect(response.body.fields).toEqual({
      body: "Request body contains unexpected fields.",
    });
    expect(repository.listDucks()).toHaveLength(initialCount);
  });
});
