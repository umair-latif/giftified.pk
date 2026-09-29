import { readFileSync } from "node:fs";

/** Loads a recorded WooCommerce response from tests/fixtures/woo. */
export function wooFixture<T = unknown>(name: string): T {
  return JSON.parse(
    readFileSync(
      new URL(`../fixtures/woo/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as T;
}

export interface WooCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  init: RequestInit | undefined;
}

type Json = Record<string, unknown>;

/**
 * In-memory fake of the WooCommerce REST API v3 routes the adapter uses,
 * served from the recorded fixtures. No network.
 */
export function fakeWoo() {
  const calls: WooCall[] = [];
  const orders = new Map<number, Json>();
  let nextId = 5200;
  const products = wooFixture<Json[]>("products");
  const zoneMethods = wooFixture<Record<string, unknown[]>>(
    "shipping-zone-methods",
  );

  const ok = (data: unknown) =>
    Response.json(data, { headers: { "x-wp-totalpages": "1" } });
  const notFound = () =>
    Response.json(
      {
        code: "woocommerce_rest_shop_order_invalid_id",
        message: "Invalid ID.",
      },
      { status: 404 },
    );

  function seedOrder(order: Json) {
    orders.set(order.id as number, structuredClone(order));
  }

  const fetchFn = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const path = url.pathname.replace(/^\/wp-json\/wc\/v3/, "");
    const method = init?.method ?? "GET";
    const body: unknown = init?.body
      ? JSON.parse(String(init.body))
      : undefined;
    calls.push({ method, path, query: url.searchParams, body, init });

    let m: RegExpMatchArray | null;
    if (method === "GET" && path === "/products") {
      const skus = url.searchParams.get("sku")?.split(",");
      return ok(
        skus
          ? products.filter((p) => skus.includes(p.sku as string))
          : products,
      );
    }
    if (method === "GET" && path === "/products/101/variations")
      return ok(wooFixture("variations-mug"));
    if (method === "GET" && path === "/shipping/zones")
      return ok(wooFixture("shipping-zones"));
    if (
      method === "GET" &&
      (m = path.match(/^\/shipping\/zones\/(\d+)\/methods$/))
    )
      return ok(zoneMethods[m[1]!] ?? []);
    if (method === "GET" && path === "/orders") {
      const list = [...orders.values()];
      if (url.searchParams.get("orderby") === "id")
        return Response.json(list, {
          headers: {
            "x-wp-totalpages": "1",
            "x-wp-total": String(list.length),
          },
        });
      return ok(list.reverse());
    }
    if (method === "POST" && path === "/orders") {
      const b = body as Json;
      const template = wooFixture<Json>("order");
      const order: Json = {
        ...template,
        id: nextId++,
        billing: { ...(template.billing as Json), ...(b.billing as Json) },
        shipping: { ...(template.shipping as Json), ...(b.shipping as Json) },
        shipping_total: (b.shipping_lines as Json[])[0]!.total,
        meta_data: b.meta_data,
      };
      seedOrder(order);
      return Response.json(order, { status: 201 });
    }
    if ((m = path.match(/^\/orders\/(\d+)$/))) {
      const o = orders.get(Number(m[1]));
      if (!o) return notFound();
      if (method === "PUT") {
        const b = body as Json;
        if (typeof b.status === "string") o.status = b.status;
        for (const nm of (b.meta_data as Json[] | undefined) ?? []) {
          const meta = o.meta_data as Json[];
          const hit = meta.find((x) => x.key === nm.key);
          if (hit) hit.value = nm.value;
          else meta.push(nm);
        }
        for (const li of (b.line_items as Json[] | undefined) ?? []) {
          const item = (o.line_items as Json[]).find((x) => x.id === li.id);
          const meta = item!.meta_data as Json[];
          for (const nm of li.meta_data as Json[]) {
            const hit = meta.find((x) => x.key === nm.key);
            if (hit) hit.value = nm.value;
            else meta.push(nm);
          }
        }
      }
      return ok(o);
    }
    if (method === "POST" && (m = path.match(/^\/orders\/(\d+)\/notes$/)))
      return Response.json(
        { id: 1, note: (body as Json).note },
        { status: 201 },
      );

    return Response.json({ code: "rest_no_route" }, { status: 404 });
  };

  return { fetch: fetchFn as typeof fetch, calls, orders, seedOrder };
}
