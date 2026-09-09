import express, { type Express } from "express";

import type { Duck } from "./catalog/duck.js";
import { renderCatalogPage } from "./views/catalog-page.js";
import {
  renderDuckDetailPage,
  renderDuckNotFoundPage,
} from "./views/duck-detail-page.js";

export function createApp(ducks: readonly Duck[]): Express {
  const app = express();

  app.get("/", (_request, response) => {
    response.status(200).type("html").send(renderCatalogPage(ducks));
  });

  app.get("/ducks/:id", (request, response) => {
    const id = request.params.id;
    const duck = typeof id === "string" ? ducks.find((item) => item.id === id) : undefined;

    if (duck === undefined) {
      response.status(404).type("html").send(renderDuckNotFoundPage());
      return;
    }

    response.status(200).type("html").send(renderDuckDetailPage(duck));
  });

  return app;
}
