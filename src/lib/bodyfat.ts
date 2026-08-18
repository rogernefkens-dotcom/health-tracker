// Jackson-Pollock 3-site skinfold formula (men: chest, abdomen, thigh) + Siri equation.
export function jacksonPollock3SiteBodyFat(params: {
  chestMm: number;
  abdomenMm: number;
  thighMm: number;
  age: number;
}) {
  const sum = params.chestMm + params.abdomenMm + params.thighMm;
  const density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * params.age;
  const bodyFatPct = 495 / density - 450;
  return Math.round(bodyFatPct * 10) / 10;
}
