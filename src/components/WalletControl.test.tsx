import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { WalletControl, type WalletControlProps } from "./WalletControl";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
// jsdom lacks the dialog top layer. Only emulate open/close; React events remain real.
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new dom.window.Event("close"));
};
const { createRoot } = await import("react-dom/client");
const container = document.createElement("div");
document.body.append(container);
let root = createRoot(container);
const icon = "data:image/svg+xml;base64,PHN2Zy8+";
const base: WalletControlProps = {
  t: (en) => en,
  wallets: [],
  current: null,
  disconnect: async () => {},
};
const button = (text: string) => {
  const found = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text,
  );
  assert.ok(found, `Missing button: ${text}`);
  return found;
};
const click = async (text: string) => {
  await act(async () => {
    button(text).click();
  });
};
afterEach(async () => {
  await act(async () => root.unmount());
  root = createRoot(container);
});
after(async () => {
  await act(async () => root.unmount());
  dom.window.close();
});

test("wallet picker renders discovered names and invokes the selected wallet action", async () => {
  let selected = "";
  await act(async () =>
    root.render(
      <WalletControl
        {...base}
        wallets={["Slush", "Other Sui Wallet"].map((name) => ({
          key: name,
          name,
          icon,
          connect: async () => {
            selected = name;
          },
        }))}
      />,
    ),
  );
  await click("Connect wallet");
  assert.equal(document.querySelector("dialog")?.open, true);
  assert.ok(button("Slush"));
  assert.ok(button("Other Sui Wallet"));
  await click("Slush");
  assert.equal(selected, "Slush");
  assert.equal(document.querySelector("dialog")?.open, false);
});
test("disconnect waits for completion, prevents duplicate clicks and closes only after success", async () => {
  let calls = 0,
    resolve!: () => void;
  const wait = new Promise<void>((r) => {
    resolve = r;
  });
  const current = {
    name: "Slush",
    address: "0x" + "1".repeat(64),
    icon,
    accounts: [],
  };
  await act(async () =>
    root.render(
      <WalletControl
        {...base}
        current={current}
        disconnect={async () => {
          calls++;
          await wait;
        }}
      />,
    ),
  );
  await act(async () =>
    document.querySelector<HTMLButtonElement>(".wallet-trigger")!.click(),
  );
  await click("Disconnect wallet");
  assert.equal(calls, 1);
  assert.equal(button("Disconnecting…").disabled, true);
  await click("Disconnecting…");
  assert.equal(calls, 1);
  assert.equal(document.querySelector("dialog")?.open, true);
  await act(async () => resolve());
  assert.equal(document.querySelector("dialog")?.open, false);
  await act(async () => root.render(<WalletControl {...base} />));
  assert.ok(button("Connect wallet"));
});
test("disconnect failure remains visible and permits retry", async () => {
  let calls = 0;
  await act(async () =>
    root.render(
      <WalletControl
        {...base}
        current={{
          name: "Slush",
          address: "0x" + "2".repeat(64),
          icon,
          accounts: [],
        }}
        disconnect={async () => {
          calls++;
          throw new Error("Wallet rejected disconnect");
        }}
      />,
    ),
  );
  await act(async () =>
    document.querySelector<HTMLButtonElement>(".wallet-trigger")!.click(),
  );
  await click("Disconnect wallet");
  assert.match(
    document.querySelector('[role="alert"]')!.textContent!,
    /Wallet rejected/,
  );
  assert.equal(document.querySelector("dialog")?.open, true);
  assert.equal(button("Disconnect wallet").disabled, false);
  await click("Disconnect wallet");
  assert.equal(calls, 2);
});
test("Chinese labels and empty-wallet guidance are visible without inventing a wallet", async () => {
  await act(async () =>
    root.render(<WalletControl {...base} t={(_en, zh) => zh} />),
  );
  await click("连接钱包");
  assert.match(
    document.querySelector("dialog")!.textContent!,
    /暂未发现兼容钱包/,
  );
  assert.equal(document.querySelectorAll(".wallet-list button").length, 0);
});
