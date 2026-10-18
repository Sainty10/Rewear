import { z } from "zod";
export interface ShippingProvider {
  createShipment(input: unknown): Promise<unknown>;
}
// EasyPost adapter intentionally creates a rated shipment only; label purchasing is a separate explicit operation.
export class EasyPost implements ShippingProvider {
  async createShipment(input: unknown) {
    if (!process.env.EASYPOST_API_KEY)
      throw new Error("EasyPost is not configured");
    const address = z.object({
      name: z.string().min(1),
      street1: z.string().min(1),
      city: z.string().min(1),
      zip: z.string().min(1),
      country: z.literal("GB"),
    });
    const shipment = z
      .object({
        to_address: address,
        from_address: address,
        parcel: z.object({
          length: z.number().positive(),
          width: z.number().positive(),
          height: z.number().positive(),
          weight: z.number().positive(),
        }),
      })
      .parse(input);
    const response = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.EASYPOST_API_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shipment }),
    });
    if (!response.ok)
      throw new Error("Shipping provider could not rate this parcel");
    return response.json();
  }
}
