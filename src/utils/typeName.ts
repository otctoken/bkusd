import { normalizeStructTag } from "@mysten/sui/utils";
export const fullType = (name: string) =>
  normalizeStructTag(name.startsWith("0x") ? name : `0x${name}`);
export const shortId = (id: string) => `${id.slice(0, 6)}…${id.slice(-4)}`;
