import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App";

describe("arayüz", () => {
  it("yerleşik veriyle açılır, sekmeler arasında geçilir", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "BGD Risk Simülatörü" })).toBeInTheDocument();
    expect(screen.getByText("1–20 / 20")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Excel tabloları" }));
    expect(screen.getByText(/20 \/ 20 satır/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Metodoloji ve sınırlar" }));
    expect(screen.getByText("3 · Kontrol puanı: P parametreleri")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Veri yükle" }));
    expect(screen.getByRole("button", { name: "Boş Risk şablonunu indir" })).toBeInTheDocument();
  });

  it("olasılık değişince doğal risk yeniden hesaplanır", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "BGD Risk Simülatörü" });
    await userEvent.click(screen.getByRole("tab", { name: "Simülatör" }));
    const detail = screen.getByRole("region", { name: "Kayıt detayı" });
    await userEvent.selectOptions(within(detail).getByLabelText("Olasılık"), "2");
    expect(within(detail).getByText("Puan · skor 3 · etki 5 × olasılık 2")).toBeInTheDocument();
  });
});
