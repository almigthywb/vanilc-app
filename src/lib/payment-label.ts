const paymentLabels: Record<string, string> = {
  tpa: "TPA",
  qr_code: "QR Code",
  unitel_money: "Unitel Money",
  cash: "Dinheiro",
  tpa_cash: "TPA / Cash",
  multicaixa_express: "Multicaixa Express",
};

export function paymentLabel(value: string): string {
  return paymentLabels[value] ?? value;
}