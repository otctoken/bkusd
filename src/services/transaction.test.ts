import { test } from "node:test";
import assert from "node:assert/strict";
import { Transaction } from "@mysten/sui/transactions";
import { appendRedeem, buildAdminTransaction } from "./transaction";
import { VAULT, MINTER, PACKAGE } from "../config/contracts";
const sender = "0x" + "1".repeat(64),
  coin = "0x" + "2".repeat(64),
  cap = "0x" + "3".repeat(64);
const types = [
  "0x" + "a".repeat(64) + "::asset::A",
  "0x" + "b".repeat(64) + "::asset::B",
];
test("signing PTB leaves gas to SDK and is isolated from simulation resolution", () => {
  const tx = buildAdminTransaction(sender, cap, "change_add_version_delay");
  assert.equal(tx.getData().gasData.budget, null);
  assert.equal(tx.getData().gasData.price, null);
  assert.equal(tx.getData().gasData.payment, null);
  const simulation = Transaction.from(tx);
  // Emulate SDK resolution on the copy; these are test values, not app defaults.
  simulation.setGasBudget(1000000);
  simulation.setGasPrice(1000);
  simulation.setGasPayment([]);
  assert.equal(tx.getData().gasData.budget, null);
  assert.equal(tx.getData().gasData.price, null);
  assert.equal(tx.getData().gasData.payment, null);
});
test("redemption is one PTB, visits every type in order, consumes successor tickets", () => {
  const tx = new Transaction();
  appendRedeem(tx, tx.object(coin), types);
  const data = tx.getData();
  const calls = data.commands.map((c) => {
    assert.equal(c.$kind, "MoveCall");
    return c.MoveCall!;
  });
  assert.deepEqual(
    calls.map((c) => c.function),
    ["retrieve_usd", "retrieve_one", "retrieve_one", "finish_retrieve"],
  );
  assert.deepEqual(calls[1].typeArguments, [types[0]]);
  assert.deepEqual(calls[2].typeArguments, [types[1]]);
  assert.equal(calls[1].arguments[1].$kind, "Result");
  assert.equal(calls[1].arguments[1].Result, 0);
  assert.deepEqual(calls[2].arguments[1], { $kind: "Result", Result: 1 });
  assert.deepEqual(calls[3].arguments[2], { $kind: "Result", Result: 2 });
  assert.equal(calls[0].package, PACKAGE);
  assert.equal(calls[0].arguments.length, 3);
  assert.equal(calls[3].arguments.length, 3);
  const ids = data.inputs.map((i) => i.UnresolvedObject?.objectId);
  assert.ok(ids.includes(VAULT));
  assert.ok(ids.includes(MINTER));
});
test("fee withdrawal converts Balance<T> and transfers Coin<T>", () => {
  const tx = buildAdminTransaction(sender, cap, "get_fee", types[0], 10n);
  const cmds = tx.getData().commands;
  assert.equal(cmds[0].MoveCall?.function, "get_fee");
  assert.equal(cmds[1].MoveCall?.function, "from_balance");
  assert.equal(cmds[2].$kind, "TransferObjects");
});
test("admin call spelling and clock argument match source", () => {
  const tx = buildAdminTransaction(
    sender,
    cap,
    "Disable_automatic_version_downgrading",
  );
  const call = tx.getData().commands[0].MoveCall!;
  assert.equal(call.function, "Disable_automatic_version_downgrading");
  assert.equal(call.arguments.length, 3);
  const rollback = buildAdminTransaction(
    sender,
    cap,
    "public_automatic_version_downgrading",
  ).getData().commands[0].MoveCall!;
  assert.equal(rollback.arguments.length, 2);
});
