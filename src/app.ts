import express, { type Express } from "express";

import type { Duck } from "./catalog/duck.js";
import { renderCatalogPage } from "./views/catalog-page.js";

export function createApp(ducks: readonly Duck[]): Express {
  const app = express();

  app.get("/", (_request, response) => {
    response.status(200).type("html").send(renderCatalogPage(ducks));
  });

  return app;
}
