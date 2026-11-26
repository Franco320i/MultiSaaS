"use client";

import { useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { isOpenAt, type HoursRange, type OpenMode } from "@/lib/hours";
import { formatCents } from "@/lib/money";
import { Stepper } from "./add-to-cart";
import { clearCart, removeProducts, useCart } from "./cart-store";
import { lineKey, selectionLabel, unitPrice, validateSelection, type ProductOptionGroup } from "@/lib/product-options";
import { useTurnstile } from "@/ui/use-turnstile";

/**
 * Barra "Ver pedido" fija abajo y hoja con el pedido y el formulario
 * (diseño, sección 11, pasos 2 y 7). Los montos que se muestran son orientativos:
 * el total real lo calcula la base al crear el pedido.
 */

export type OrderingConfig = {
  /** Solo productos que hoy se pueden pedir (publicados y disponibles). */
  products: Record<string, { name: string; price: number; optionGroups: ProductOptionGroup[] }>;
  currency: string;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  openMode: OpenMode;
  hours: HoursRange[];
  timeZone: string;
  closedMessage: string | null;
  turnstileSiteKey: string;
};

type Fulfillment = "pickup" | "delivery";
type Customer = { name: string; phone: string; address: string };
type Done = { number: number; whatsappUrl: string | null };

const CUSTOMER_KEY = "datos:v1";

function loadCustomer(): Customer {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CUSTOMER_KEY) ?? "{}");
    return {
      name: typeof raw.name === "string" ? raw.name : "",
      phone: typeof raw.phone === "string" ? raw.phone : "",
      address: typeof raw.address === "string" ? raw.address : "",
    };
  } catch {
    return { name: "", phone: "", address: "" };
  }
}

function saveCustomer(customer: Customer) {
  try {
    window.localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  } catch {
    // Sin almacenamiento: la próxima vez se vuelven a escribir.
  }
}

const everyMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
};

function useAcceptsOrders(config: OrderingConfig): boolean {
  return useSyncExternalStore(
    everyMinute,
    () =>
      config.openMode === "auto" && config.hours.length === 0
        ? true
        : isOpenAt(config.hours, config.openMode, new Date(), config.timeZone),
    () => true,
  );
}

export function Ordering({ config }: { config: OrderingConfig }) {
  const cart = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  // Solo líneas que hoy se pueden pedir: producto disponible y opciones todavía válidas.
  // El precio es informativo; el que vale lo calcula la base.
  const lines: Line[] = cart.flatMap((l) => {
    const product = config.products[l.productId];
    if (!product || !validateSelection(product.optionGroups, l.optionIds).ok) return [];
    const price = unitPrice(product.price, product.optionGroups, l.optionIds);
    return [
      {
        key: lineKey(l.productId, l.optionIds),
        productId: l.productId,
        optionIds: l.optionIds,
        quantity: l.quantity,
        name: product.name,
        detail: selectionLabel(product.optionGroups, l.optionIds),
        price,
        lineTotal: price * l.quantity,
      },
    ];
  });
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const money = (cents: number) => formatCents(cents, config.currency);

  const show = () => {
    setDone(null);
    setOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      {count > 0 && !open ? (
        // Barra flotante oscura (se invierte sola en modo oscuro): cantidad, total y "Ver pedido".
        <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={show}
            aria-label={`Ver pedido · ${count} · ${money(subtotal)}`}
            className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-3 rounded-[20px] bg-foreground py-2 pr-2 pl-3 text-left text-background shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)]"
          >
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-background/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
                <path d="M5.5 8h13l-1 12h-11z" />
                <path d="M9 10V7a3 3 0 0 1 6 0v3" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[15px] font-bold">{count === 1 ? "1 producto" : `${count} productos`}</span>
              <span className="block text-[12px] opacity-70">Tu pedido</span>
            </span>
            <span className="text-right leading-tight tabular-nums">
              <span className="block text-[11px] opacity-70">Total</span>
              <span className="block text-[15px] font-bold">{money(subtotal)}</span>
            </span>
            <span className="rounded-[13px] bg-brand px-3 py-2.5 text-[14px] font-bold text-brand-foreground">Ver pedido ›</span>
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-labelledby="pedido-titulo"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-background p-0 text-foreground backdrop:bg-black/50 md:mr-0 md:ml-auto md:w-[440px] md:rounded-l-2xl"
      >
        {open ? (
          done ? (
            <OrderDone done={done} onClose={close} />
          ) : (
            <Checkout
              config={config}
              lines={lines}
              subtotal={subtotal}
              onClose={close}
              onDone={(result) => {
                clearCart();
                setDone(result);
                if (result.whatsappUrl) window.location.assign(result.whatsappUrl);
              }}
            />
          )
        ) : null}
      </dialog>
    </>
  );
}

type Line = {
  key: string;
  productId: string;
  optionIds: string[];
  quantity: number;
  name: string;
  /** Opciones elegidas, por ejemplo "Doble, Panceta". */
  detail: string;
  price: number;
  lineTotal: number;
};

function Checkout({
  config,
  lines,
  subtotal,
  onClose,
  onDone,
}: {
  config: OrderingConfig;
  lines: Line[];
  subtotal: number;
  onClose: () => void;
  onDone: (done: Done) => void;
}) {
  const id = useId();
  const acceptsOrders = useAcceptsOrders(config);
  const { containerRef, getToken } = useTurnstile(config.turnstileSiteKey);
  const [customer, setCustomer] = useState<Customer>(loadCustomer);
  const [fulfillment, setFulfillment] = useState<Fulfillment>(config.acceptsPickup ? "pickup" : "delivery");
  const [notes, setNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const money = (cents: number) => formatCents(cents, config.currency);
  const fee = fulfillment === "delivery" ? config.deliveryFee : 0;
  const missing = Math.max(0, config.minOrderAmount - subtotal);
  const canSend = lines.length > 0 && acceptsOrders && missing === 0 && !sending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const turnstileToken = await getToken().catch(() => null);
      if (!turnstileToken) {
        setError("No pudimos verificar el envío. Recargá la página y probá de nuevo.");
        return;
      }
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, optionIds: l.optionIds, quantity: l.quantity })),
          customerName: customer.name,
          customerPhone: customer.phone,
          fulfillment,
          deliveryAddress: fulfillment === "delivery" ? customer.address : undefined,
          notes: notes || undefined,
          idempotencyKey,
          turnstileToken,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (Array.isArray(body.unavailable)) removeProducts(body.unavailable);
        setError(typeof body.error === "string" ? body.error : "No pudimos registrar el pedido. Probá de nuevo.");
        return;
      }
      saveCustomer(customer);
      setIdempotencyKey(crypto.randomUUID());
      onDone({ number: body.number, whatsappUrl: body.whatsappUrl ?? null });
    } catch {
      setError("No hay conexión. Revisá internet y probá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  const field = "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-[16px] text-foreground placeholder:text-muted";

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="pedido-titulo" className="font-display text-[24px]">
          Tu pedido
        </h2>
        <button type="button" onClick={onClose} className="min-h-11 rounded-full px-4 text-[15px] font-semibold text-muted hover:text-foreground">
          Seguir mirando
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
        {lines.length === 0 ? (
          <p className="py-8 text-center text-muted">Tu pedido está vacío. Agregá productos del catálogo.</p>
        ) : (
          <ul className="divide-y divide-line">
            {lines.map((line) => (
              <li key={line.key} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{line.name}</p>
                  {line.detail ? <p className="text-[14px] text-foreground">{line.detail}</p> : null}
                  <p className="text-[14px] text-muted tabular-nums">{money(line.price)} c/u</p>
                </div>
                <Stepper lineKey={line.key} name={line.name} quantity={line.quantity} />
                <span className="w-20 text-right font-semibold tabular-nums">{money(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}

        {config.acceptsPickup && config.acceptsDelivery ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[15px] font-semibold">¿Cómo lo recibís?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["pickup", "Retiro en el local", "Sin costo"],
                  ["delivery", "Envío", money(config.deliveryFee)],
                ] as const
              ).map(([value, label, detail]) => (
                <label
                  key={value}
                  className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border px-4 py-2 ${
                    fulfillment === value ? "border-brand ring-1 ring-brand" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value={value}
                    checked={fulfillment === value}
                    onChange={() => setFulfillment(value)}
                    className="sr-only"
                  />
                  <span className="font-semibold">{label}</span>
                  <span className="text-[14px] text-muted tabular-nums">{detail}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-[15px] text-muted">
            {config.acceptsDelivery ? `Envío a domicilio: ${money(config.deliveryFee)}` : "Retiro en el local"}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {fulfillment === "delivery" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-address`} className="text-[15px] font-semibold">
                Dirección de entrega
              </label>
              <input
                id={`${id}-address`}
                required
                minLength={3}
                maxLength={200}
                autoComplete="street-address"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                placeholder="Calle, número y entre calles"
                className={field}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-name`} className="text-[15px] font-semibold">
              Tu nombre
            </label>
            <input
              id={`${id}-name`}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-phone`} className="text-[15px] font-semibold">
              Teléfono
            </label>
            <input
              id={`${id}-phone`}
              required
              type="tel"
              inputMode="tel"
              // Mismo formato que el servidor. En el atributo pattern el navegador usa el
              // modo "v": paréntesis y guion van escapados dentro de [ ].
              pattern="\+?[0-9 \(\)\-]{6,30}"
              autoComplete="tel"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              placeholder="Por ejemplo, 2954 123456"
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-notes`} className="text-[15px] font-semibold">
              Notas <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id={`${id}-notes`}
              maxLength={500}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Por ejemplo, sin cebolla"
              className={`${field} py-3`}
            />
          </div>
        </div>

        <dl className="flex flex-col gap-1 border-t border-line pt-4 text-[15px] tabular-nums">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          {fulfillment === "delivery" ? (
            <div className="flex justify-between">
              <dt className="text-muted">Envío</dt>
              <dd>{money(fee)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-[17px] font-semibold">
            <dt>Total</dt>
            <dd>{money(subtotal + fee)}</dd>
          </div>
        </dl>

        <div ref={containerRef} />
      </div>

      <footer className="flex flex-col gap-2 border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {error ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
            {error}
          </p>
        ) : !acceptsOrders ? (
          <p className="text-center text-[15px] text-muted">
            {config.closedMessage ?? "El local está cerrado ahora. Podés armar el pedido y mandarlo cuando abra."}
          </p>
        ) : missing > 0 && lines.length > 0 ? (
          <p className="text-center text-[15px] text-muted">
            El pedido mínimo es {money(config.minOrderAmount)}. Te faltan {money(missing)}.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!canSend}
          className="min-h-14 rounded-full bg-brand px-6 text-[16px] font-semibold text-brand-foreground disabled:opacity-50"
        >
          {sending ? "Enviando…" : "Enviar pedido por WhatsApp"}
        </button>
      </footer>
    </form>
  );
}

function OrderDone({ done, onClose }: { done: Done; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-[15px] font-semibold uppercase tracking-wide text-muted">Pedido registrado</p>
      <h2 id="pedido-titulo" className="font-display text-[40px] leading-none tabular-nums">
        #{done.number}
      </h2>
      {done.whatsappUrl ? (
        <>
          <p className="max-w-xs text-muted">
            Te abrimos WhatsApp con el pedido escrito. Si no se abrió, tocá el botón para mandarlo.
          </p>
          <a
            href={done.whatsappUrl}
            className="flex min-h-14 items-center rounded-full bg-brand px-8 text-[16px] font-semibold text-brand-foreground"
          >
            Enviar por WhatsApp
          </a>
        </>
      ) : (
        <p className="max-w-xs text-muted">El local ya tiene tu pedido y te va a contactar.</p>
      )}
      <button type="button" onClick={onClose} className="min-h-11 px-4 text-[15px] font-semibold text-muted hover:text-foreground">
        Volver al catálogo
      </button>
    </div>
  );
}
