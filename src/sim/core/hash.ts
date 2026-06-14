// FNV-1a hash: deterministic state hashing

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

export function fnv1aHash(data: string): bigint {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < data.length; i++) {
    hash ^= BigInt(data.charCodeAt(i));
    hash = hash * FNV_PRIME;
  }
  return hash;
}

export function fnv1aHashString(str: string): string {
  return fnv1aHash(str).toString(16);
}
