import assert from "node:assert/strict";

export async function verifyEconomy(provider, contractId, record) {
  const economy = await provider.callFunction({
    contractId,
    method: "get_run_economy",
    args: { run_id: record.run_id },
  });
  const run = record.run;
  assert.equal(economy.revision, run.revision);
  assert.equal(economy.tick, run.tick);
  assert.equal(
    economy.locked,
    ["moonpark-v6", "moonpark-v7"].includes(run.version) || !run.finished,
  );
  const expected = {
    park: [run.cash, 0, 0, 0],
    passengers: [
      run.guests.reduce((n, guest) => n + guest.cash, 0) +
        run.grant_cash +
        run.grant_escrow,
      0,
      0,
      0,
    ],
    omar: [0, 0, 0, 0],
    mina: [0, 0, 0, 0],
    logistics: [run.supplier_cash + run.builder_cash, ...run.supplies],
  };
  for (const building of run.buildings) {
    const role = { food: "omar", drink: "mina" }[building.kind];
    if (!role) continue;
    expected[role][0] += building.cash;
    expected[role][role === "omar" ? 1 : 2] +=
      building.stock + building.delivery_qty;
  }
  for (const wallet of economy.wallets) {
    assert.deepEqual(wallet.balances, expected[wallet.role].map(String));
    if (wallet.role === "park") assert.equal(wallet.account_id, record.owner);
    if (wallet.role === "passengers")
      assert.equal(wallet.account_id, contractId);
  }
  for (let asset = 0; asset < 4; asset++) {
    const supply = economy.wallets.reduce(
      (n, wallet) => n + BigInt(wallet.balances[asset]),
      0n,
    );
    assert.equal(supply.toString(), economy.supplies[asset]);
    assert.equal(
      supply.toString(),
      String(
        asset === 0
          ? run.money_supply
          : (run.issued_goods?.[asset - 1] ?? 2048) - run.consumed[asset - 1],
      ),
    );
  }
  return economy;
}
