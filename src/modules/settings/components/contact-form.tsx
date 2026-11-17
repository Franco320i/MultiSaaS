"use client";

import { useId, useState } from "react";
import { centsToInput } from "@/lib/money";
import type { SettingsFormState } from "../actions";
import { Field, inputClass, SettingsForm } from "./fields";

/** Paso "Contacto y entrega": WhatsApp, Instagram, dirección, retiro y envío. */
export function ContactForm({
  action,
  next,
  submitLabel,
  values,
}: {
  action: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  next?: string;
  submitLabel: string;
  values: {
    whatsapp_phone: string | null;
    instagram: string | null;
    address: string | null;
    city: string | null;
    accepts_pickup: boolean;
    accepts_delivery: boolean;
    delivery_fee: number;
    min_order_amount: number;
  };
}) {
  const id = useId();
  const [delivery, setDelivery] = useState(values.accepts_delivery);

  return (
    <SettingsForm action={action} next={next} submitLabel={submitLabel}>
      {(fields) => (
        <>
          <Field id={`${id}-whatsapp`} label="WhatsApp del comercio" hint="Ahí te llegan los pedidos. Con código de país, por ejemplo +54 9 2954 123456.">
            <input
              id={`${id}-whatsapp`}
              name="whatsapp_phone"
              type="tel"
              inputMode="tel"
              required
              defaultValue={fields?.whatsapp_phone ?? values.whatsapp_phone ?? "+54 9 "}
              className={inputClass}
            />
          </Field>
          <Field id={`${id}-instagram`} label="Instagram" optional>
            <input id={`${id}-instagram`} name="instagram" maxLength={31} placeholder="@tucomercio" defaultValue={fields?.instagram ?? values.instagram ?? ""} className={inputClass} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-address`} label="Dirección del local" optional>
              <input id={`${id}-address`} name="address" maxLength={200} defaultValue={fields?.address ?? values.address ?? ""} className={inputClass} />
            </Field>
            <Field id={`${id}-city`} label="Ciudad" optional>
              <input id={`${id}-city`} name="city" maxLength={80} defaultValue={fields?.city ?? values.city ?? ""} className={inputClass} />
            </Field>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 text-[15px] font-semibold">¿Cómo entregás los pedidos?</legend>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-4 has-[:checked]:border-accent">
              <input type="checkbox" name="accepts_pickup" defaultChecked={fields ? fields.accepts_pickup === "on" : values.accepts_pickup} className="size-5 accent-[var(--accent)]" />
              <span className="font-semibold">Retiro en el local</span>
            </label>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-4 has-[:checked]:border-accent">
              <input
                type="checkbox"
                name="accepts_delivery"
                defaultChecked={fields ? fields.accepts_delivery === "on" : values.accepts_delivery}
                onChange={(e) => setDelivery(e.target.checked)}
                className="size-5 accent-[var(--accent)]"
              />
              <span className="font-semibold">Envío a domicilio</span>
            </label>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            {delivery ? (
              <Field id={`${id}-fee`} label="Costo de envío" hint="En pesos. 0 si es gratis.">
                <input
                  id={`${id}-fee`}
                  name="delivery_fee"
                  inputMode="decimal"
                  defaultValue={fields?.delivery_fee ?? centsToInput(values.delivery_fee)}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            ) : null}
            <Field id={`${id}-min`} label="Pedido mínimo" hint="En pesos. Dejalo vacío si no tenés.">
              <input
                id={`${id}-min`}
                name="min_order_amount"
                inputMode="decimal"
                defaultValue={fields?.min_order_amount ?? (values.min_order_amount ? centsToInput(values.min_order_amount) : "")}
                className={`${inputClass} tabular-nums`}
              />
            </Field>
          </div>
        </>
      )}
    </SettingsForm>
  );
}
