export function computeFourHourPrice(dayPrice: number): number {
  const raw = dayPrice * 0.25;
  return Math.max(50, Math.round(raw / 10) * 10);
}

export function computeDailySavingsVsFourHour(dayPrice: number): number {
  const fourHourPrice = computeFourHourPrice(dayPrice);
  const sixBlocksCost = fourHourPrice * 6;
  if (sixBlocksCost <= 0) {
    return 0;
  }
  return Math.max(
    0,
    Math.round(((sixBlocksCost - dayPrice) / sixBlocksCost) * 100)
  );
}
