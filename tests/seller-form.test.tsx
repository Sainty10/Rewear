// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import SellForm from "../app/sell/sell-form";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Guided seller workflow", () => {
  it("cannot advance without a real uploaded photo", () => {
    render(<SellForm />);
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    expect(screen.getByRole("alert").textContent).toContain("actual clothes");
    expect(
      screen.queryByRole("group", { name: "Exactly what’s in the bundle?" }),
    ).toBeNull();
  });
  it("retains the first upload if a later file fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "photo1", url: "/test-photo" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "File rejected" }),
        }),
    );
    render(<SellForm />);
    fireEvent.change(screen.getByLabelText("Add clear photos (up to 8)"), {
      target: {
        files: [
          new File(["photo"], "one.jpg", { type: "image/jpeg" }),
          new File(["bad"], "two.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("File rejected"),
    );
    expect(screen.getByAltText("Bundle photo 1")).toBeTruthy();
  });
  it("adds groups, computes the actual total and preserves details when going back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "photo1", url: "/test-photo" }),
      }),
    );
    render(<SellForm />);
    fireEvent.change(screen.getByLabelText("Add clear photos (up to 8)"), {
      target: {
        files: [new File(["photo"], "one.jpg", { type: "image/jpeg" })],
      },
    });
    await waitFor(() =>
      expect(screen.getByAltText("Bundle photo 1")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    fireEvent.change(screen.getByLabelText("Group 1 garment type"), {
      target: { value: "T-shirts" },
    });
    fireEvent.change(screen.getByLabelText("Group 1 pieces"), {
      target: { value: "3" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "+ Add another clothing group" }),
    );
    expect(screen.getByRole("status").textContent).toContain("4 pieces");
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    expect(
      (screen.getByLabelText("Group 1 garment type") as HTMLInputElement).value,
    ).toBe("T-shirts");
  });
});
it("re-verifies and saves an existing bundle through the owner-edit endpoint", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ id: "00000000-0000-4000-8000-000000000011" }),
    });
  vi.stubGlobal("fetch", fetchMock);
  render(
    <SellForm
      initial={{
        id: "00000000-0000-4000-8000-000000000011",
        title: "Two cotton T-shirts",
        description: "Two cotton T-shirts, with all wear clearly disclosed.",
        category: "Kids",
        size: "2–3",
        brand: "Mixed",
        condition: "Good",
        location: "Bath",
        pickup: true,
        price_pence: 1200,
        photos: [
          { id: "00000000-0000-4000-8000-000000000001", url: "/test-photo" },
        ],
        items: [
          {
            name: "T-shirts",
            size: "2–3",
            brand: "Mixed",
            condition: "Good",
            quantity: 2,
            notes: "Small mark",
          },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
  expect(
    (screen.getByLabelText("Group 1 pieces") as HTMLInputElement).value,
  ).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
  const verification = screen.getByRole("checkbox", {
    name: /I have checked every photo/,
  });
  expect((verification as HTMLInputElement).checked).toBe(false);
  fireEvent.click(verification);
  fireEvent.click(
    screen.getByRole("button", { name: "Save verified changes →" }),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(payload.action).toBe("update_listing");
  expect(payload.quantity).toBe(2);
  expect(payload.price_pence).toBe(1200);
  expect(payload.verified).toBe(true);
  expect(payload.listing_id).toBe("00000000-0000-4000-8000-000000000011");
});
