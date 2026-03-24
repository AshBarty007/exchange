export const FIAT_DECIMALS = 4;
const FIAT_SCALE = BigInt(10 ** FIAT_DECIMALS);

function normalizeInput(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("金额格式无效");
    }
    return value.toString();
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("金额不能为空");
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("金额格式无效");
  }
  return trimmed;
}

export function fiatToRaw(value: string | number): string {
  const normalized = normalizeInput(value);
  const [integerPart, fractionalPart = ""] = normalized.split(".");

  if (fractionalPart.length > FIAT_DECIMALS) {
    throw new Error(`最多支持 ${FIAT_DECIMALS} 位小数`);
  }

  const paddedFraction = fractionalPart.padEnd(FIAT_DECIMALS, "0");
  const raw =
    BigInt(integerPart) * FIAT_SCALE + BigInt(paddedFraction || "0");
  return raw.toString();
}

export function rawToFiat(
  rawValue: string | number | bigint,
  keepTrailingZeros = false
): string {
  const value =
    typeof rawValue === "bigint" ? rawValue : BigInt(String(rawValue || "0"));
  const negative = value < 0n;
  const absolute = negative ? -value : value;

  const integerPart = absolute / FIAT_SCALE;
  const fractionalPart = (absolute % FIAT_SCALE)
    .toString()
    .padStart(FIAT_DECIMALS, "0");

  const fraction = keepTrailingZeros
    ? fractionalPart
    : fractionalPart.replace(/0+$/, "");

  const formatted = fraction
    ? `${integerPart.toString()}.${fraction}`
    : integerPart.toString();

  return negative ? `-${formatted}` : formatted;
}
