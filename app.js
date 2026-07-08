const policies = {
  P3P9: {
    name: "P3-P9",
    hasCompletion: true,
    completionMode: "grossPlusMaintenance",
    completionDiscount: 0.07,
    noLoanDiscount: 0.05,
    fixedDiscounts: { Studio: 70000000, "1BR+": 100000000, "2BR": 150000000 },
    completionUnits: { Studio: 5100000, "1BR+": 4600000, "2BR": 5400000 },
    ttsJuly: { tts95: 0.125, tts70: 0.10, tts50: 0.08 },
    handover: "2027-05-30",
    loanSupport: "HTLS 24 thang, khong muon hon 15/08/2028",
  },
  P10P18: {
    name: "P10/P16/P18",
    hasCompletion: true,
    completionMode: "netTimes112",
    completionDiscount: 0.03,
    noLoanDiscount: 0.05,
    fixedDiscounts: {},
    completionUnits: { Studio: 4722222, "1BR+": 4259259, "2BR": 5000000 },
    ttsJuly: { tts95: 0.095, tts70: 0.065, tts50: 0.035 },
    handover: "2027-09-30",
    loanSupport: "HTLS 24 thang, khong muon hon 15/07/2028",
  },
  P7P15P19: {
    name: "P7/P15/P19",
    hasCompletion: false,
    completionMode: "none",
    completionDiscount: 0,
    noLoanDiscount: 0.05,
    fixedDiscounts: {},
    completionUnits: {},
    ttsJuly: { tts95: 0.115, tts70: 0.065, tts50: 0.035 },
    earlyBird: 0.01,
    handover: "2027-09-30",
    loanSupport: "HTLS 30 thang, khong qua 31/10/2028",
  },
  P24P26: {
    name: "P24/P25/P26",
    hasCompletion: false,
    completionMode: "none",
    completionDiscount: 0,
    noLoanDiscount: 0.05,
    fixedDiscounts: {},
    completionUnits: {},
    ttsJuly: { tts95: 0.105, tts70: 0.055, tts50: 0.025 },
    earlyBird: 0.01,
    handover: "2028-12-31",
    loanSupport: "HTLS 30 thang, khong qua 31/10/2028",
  },
};

const depositByType = {
  Studio: 50000000,
  "1BR+": 100000000,
  "2BR": 150000000,
};

const scenarioLabels = {
  loan: "Co vay",
  standard: "Khong vay",
  tts50: "TTS 50%",
  tts70: "TTS 70%",
  tts95: "TTS 95%",
};

const els = {
  unitCode: document.querySelector("#unitCode"),
  policyGroup: document.querySelector("#policyGroup"),
  unitType: document.querySelector("#unitType"),
  area: document.querySelector("#area"),
  quoteDate: document.querySelector("#quoteDate"),
  listedGross: document.querySelector("#listedGross"),
  baseNet: document.querySelector("#baseNet"),
  bankGuarantee: document.querySelector("#bankGuarantee"),
  loanRatio: document.querySelector("#loanRatio"),
  totalPrice: document.querySelector("#totalPrice"),
  upfrontPrice: document.querySelector("#upfrontPrice"),
  resultRows: document.querySelector("#resultRows"),
  discountRows: document.querySelector("#discountRows"),
  scheduleRows: document.querySelector("#scheduleRows"),
  copyBtn: document.querySelector("#copyBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  toast: document.querySelector("#toast"),
};

let activeScenario = "loan";
let lastQuoteText = "";

function parseMoney(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value || "").replace(/[^\d.-]/g, "");
  return Number(cleaned || 0);
}

function parseNumber(value) {
  const cleaned = String(value || "").replace(",", ".").replace(/[^\d.-]/g, "");
  return Number(cleaned || 0);
}

function round(value) {
  return Math.round(Number(value || 0));
}

function money(value) {
  return `${round(value).toLocaleString("vi-VN")} đ`;
}

function inputMoney(value) {
  const rounded = round(value);
  return rounded ? rounded.toLocaleString("en-US") : "";
}

function percent(value) {
  return `${(value * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
}

function dateFromText(dateText) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateText || ""));
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(dateText || "2026-07-08");
  if (Number.isNaN(parsed.getTime())) return new Date(2026, 6, 8);
  return parsed;
}

function addDays(dateValue, days) {
  const d = dateValue instanceof Date ? new Date(dateValue) : dateFromText(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateText(dateValue) {
  const d = dateValue instanceof Date ? dateValue : dateFromText(dateValue);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function spreadDates(startValue, endValue, count) {
  const start = startValue instanceof Date ? new Date(startValue) : dateFromText(startValue);
  let end = endValue instanceof Date ? new Date(endValue) : dateFromText(endValue);
  if (end.getTime() <= start.getTime()) {
    end = addDays(start, (count - 1) * 30);
  }
  const step = (end.getTime() - start.getTime()) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => new Date(start.getTime() + step * index));
}

function syncBaseFromGross() {
  els.baseNet.value = inputMoney(parseMoney(els.listedGross.value) / 1.12);
}

function formatMoneyInput(input) {
  input.value = inputMoney(parseMoney(input.value));
}

function monthDiffFromJuly2026(dateText) {
  const d = new Date(dateText || "2026-07-01");
  if (Number.isNaN(d.getTime())) return 0;
  return (d.getFullYear() - 2026) * 12 + (d.getMonth() - 6);
}

function rollingTtsRate(policy, scenario, dateText) {
  if (!["tts50", "tts70", "tts95"].includes(scenario)) return 0;
  const base = policy.ttsJuly[scenario] || 0;
  const months = Math.max(0, monthDiffFromJuly2026(dateText));
  return Math.max(0, base - months * 0.005);
}

function completionBreakdown(policy, unitType, area) {
  if (!policy.hasCompletion) return { grossWithVat: 0, maintenance: 0, total: 0 };
  const unit = policy.completionUnits[unitType] || 0;
  let grossWithVat = 0;
  let maintenance = 0;
  if (policy.completionMode === "grossPlusMaintenance") {
    grossWithVat = round(unit * area);
    maintenance = round((unit / 1.1) * area * 0.02);
  } else if (policy.completionMode === "netTimes112") {
    const net = unit * area;
    grossWithVat = round(net * 1.1);
    maintenance = round(net * 0.02);
  }
  return { grossWithVat, maintenance, total: grossWithVat + maintenance };
}

function completionValue(policy, unitType, area) {
  return completionBreakdown(policy, unitType, area).total;
}

function buildStandardSchedule(result) {
  const deposit = depositByType[result.unitType] || 0;
  const quoteDate = dateFromText(els.quoteDate.value);
  const handoverDate = dateFromText(result.policy.handover);
  const secondDate = addDays(quoteDate, 9);
  const installmentDates = spreadDates(addDays(secondDate, 60), addDays(handoverDate, -14), 15);
  const completion = completionBreakdown(result.policy, result.unitType, result.area);

  const rows = [
    [`Coc (${formatDateText(quoteDate)})`, deposit],
    [`Lan 2 - 15% (${formatDateText(secondDate)})`, round(result.rawWithVat * 0.15 - deposit)],
  ];

  if (completion.total) {
    rows.push([
      `Ky HDMB - 70% hoan thien (${formatDateText(addDays(secondDate, 3))})`,
      round(completion.grossWithVat * 0.70),
    ]);
  }

  rows.push([`Lan 3 - 10% (${formatDateText(installmentDates[0])})`, round(result.rawWithVat * 0.10)]);
  for (let index = 0; index < 14; index += 1) {
    rows.push([
      `Lan ${index + 4} - 5% (${formatDateText(installmentDates[index + 1])})`,
      round(result.rawWithVat * 0.05),
    ]);
  }

  rows.push([
    `Ban giao - KPBT + thue 5% (${formatDateText(handoverDate)})`,
    round(result.maintenance + result.vat * 0.05 + completion.grossWithVat * 0.30 + completion.maintenance),
  ]);
  rows.push([`5% GCN (${formatDateText(handoverDate)})`, round(result.netAfterDiscount * 0.05)]);

  const totalRows = rows.reduce((sum, [, amount]) => sum + round(amount), 0);
  const diff = result.total - totalRows;
  if (diff) rows[rows.length - 2][1] = round(rows[rows.length - 2][1] + diff);

  return rows;
}

function applyDiscount(items, label, rateOrAmount, base, isRate = true) {
  const amount = isRate ? round(base * rateOrAmount) : round(rateOrAmount);
  if (amount > 0) {
    items.push({ label, amount, rate: isRate ? rateOrAmount : null });
  }
  return base - amount;
}

function calculate(options = {}) {
  const policy = policies[els.policyGroup.value];
  const unitType = els.unitType.value;
  const area = parseNumber(els.area.value);
  const baseNet = parseMoney(els.baseNet.value);
  const loanRatio = Math.max(0, Math.min(100, parseNumber(els.loanRatio.value))) / 100;
  const scenario = options.scenario || activeScenario;
  const includeGuarantee = options.includeGuarantee ?? els.bankGuarantee.checked;
  const discounts = [];

  let remaining = baseNet;
  const fixed = policy.fixedDiscounts[unitType] || 0;
  remaining = applyDiscount(discounts, `CK loai can ${unitType}`, fixed, remaining, false);

  if (policy.earlyBird) {
    remaining = applyDiscount(discounts, "Early Bird", policy.earlyBird, remaining);
  }

  if (policy.completionDiscount) {
    remaining = applyDiscount(
      discounts,
      `CK goi hoan thien ${percent(policy.completionDiscount)}`,
      policy.completionDiscount,
      remaining
    );
  }

  if (scenario !== "loan") {
    remaining = applyDiscount(discounts, "Khong vay 5%", policy.noLoanDiscount, remaining);
  }

  if (includeGuarantee) {
    remaining = applyDiscount(discounts, "CK bao lanh NH 1%", 0.01, remaining);
  }

  const ttsRate = rollingTtsRate(policy, scenario, els.quoteDate.value);
  if (ttsRate) {
    remaining = applyDiscount(discounts, `CK ${scenarioLabels[scenario]} ${percent(ttsRate)}`, ttsRate, remaining);
  }

  const netAfterDiscount = round(remaining);
  const vat = round(netAfterDiscount * 0.10);
  const maintenance = round(netAfterDiscount * 0.02);
  const rawGrossAfterDiscount = netAfterDiscount + vat + maintenance;
  const completion = completionValue(policy, unitType, area);
  const total = rawGrossAfterDiscount + completion;
  const rawWithVat = netAfterDiscount + vat;
  const bankDisbursement = scenario === "loan" ? round(rawWithVat * loanRatio) : 0;
  const deposit = depositByType[unitType] || 0;

  let upfront = 0;
  let schedule = [];
  if (scenario === "loan") {
    const noGuarantee = includeGuarantee
      ? calculate({ scenario: "loan", includeGuarantee: false })
      : null;
    const basis = noGuarantee || { netAfterDiscount, vat };
    const basisRawWithVat = basis.netAfterDiscount + basis.vat;
    const payment2 = round(basisRawWithVat * 0.15 - deposit);
    const payment4 = round(basisRawWithVat * 0.10);
    upfront = deposit + payment2 + payment4;

    schedule = [
      ["Coc", deposit],
      ["Lan 2", payment2],
      ["HDBM - 70% noi that", round(completion * 0.70)],
      ["NH giai ngan", bankDisbursement],
      ["Lan 4", payment4],
      ["Ban giao", round(maintenance + vat * 0.05 + completion * 0.30)],
      ["5% GCN", round(netAfterDiscount * 0.05)],
    ];
  } else if (scenario === "standard") {
    schedule = buildStandardSchedule({
      policy,
      unitType,
      area,
      netAfterDiscount,
      vat,
      maintenance,
      total,
      rawWithVat,
    });
  } else {
    schedule = [
      ["Tong gia", total],
      ["Coc", deposit],
      ["Con lai sau coc", Math.max(0, total - deposit)],
    ];
  }

  return {
    policy,
    scenario,
    unitType,
    area,
    baseNet,
    discounts,
    netAfterDiscount,
    vat,
    maintenance,
    rawGrossAfterDiscount,
    completion,
    total,
    rawWithVat,
    bankDisbursement,
    upfront,
    schedule,
    ttsRate,
  };
}

function row(label, value, className = "") {
  return `<div class="row ${className}"><span>${label}</span><strong>${value}</strong></div>`;
}

function render() {
  const result = calculate();
  els.totalPrice.textContent = money(result.total);
  els.upfrontPrice.textContent = activeScenario === "loan" ? money(result.upfront) : "";

  const rows = [
    row("Phuong an", scenarioLabels[activeScenario], "highlight"),
    row("Nhom toa", result.policy.name),
    row("Gia tho sau CK", money(result.rawGrossAfterDiscount)),
    row("Gia noi that/hoan thien", money(result.completion)),
    row("Tong gia thanh toan", money(result.total), "highlight"),
  ];
  if (activeScenario === "loan") {
    rows.push(row("Tien truoc de bao", money(result.upfront), "highlight"));
    rows.push(row("Ngan hang giai ngan", money(result.bankDisbursement)));
  }
  if (result.ttsRate) {
    rows.push(row("Ty le TTS dang ap dung", percent(result.ttsRate)));
  }
  if (activeScenario === "loan") {
    rows.push(row("HTLS", result.policy.loanSupport));
  }
  els.resultRows.innerHTML = rows.join("");

  const discountRows = result.discounts.map((item) => {
    const label = item.rate ? `${item.label}` : item.label;
    return row(label, money(item.amount));
  });
  discountRows.push(row("Gia chua VAT/KPBT sau CK", money(result.netAfterDiscount), "highlight"));
  discountRows.push(row("VAT 10%", money(result.vat)));
  discountRows.push(row("KPBT 2%", money(result.maintenance)));
  els.discountRows.innerHTML = discountRows.join("");

  els.scheduleRows.innerHTML = result.schedule.map(([label, value]) => {
    const className = /NH|Tong|Tien|Ban giao|GCN/.test(label) ? "highlight" : "";
    return row(label, money(value), className);
  }).join("");

  lastQuoteText = makeQuoteText(result);
}

function makeQuoteText(result) {
  const parts = [
    `${els.unitCode.value.trim() || "Can ho"} - ${result.policy.name}`,
    `Phuong an: ${scenarioLabels[activeScenario]}`,
    `Tong gia: ${money(result.total)}`,
  ];
  if (activeScenario === "loan") {
    parts.push(`Tien truoc: ${money(result.upfront)}`);
    parts.push(`NH giai ngan: ${money(result.bankDisbursement)}`);
    parts.push(`HTLS: ${result.policy.loanSupport}`);
  }
  parts.push(`Gia tho sau CK: ${money(result.rawGrossAfterDiscount)}`);
  if (result.completion) parts.push(`Noi that/hoan thien: ${money(result.completion)}`);
  return parts.join("\n");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function resetDefaults() {
  els.unitCode.value = "P90316";
  els.policyGroup.value = "P3P9";
  els.unitType.value = "Studio";
  els.area.value = "29.70";
  els.quoteDate.value = "2026-07-08";
  els.listedGross.value = "1,671,152,684";
  syncBaseFromGross();
  els.bankGuarantee.checked = true;
  els.loanRatio.value = "70";
  activeScenario = "loan";
  document.querySelectorAll(".segmented button").forEach((button) => {
    button.classList.toggle("active", button.dataset.scenario === activeScenario);
  });
  render();
}

document.querySelectorAll("input, select").forEach((input) => {
  input.addEventListener("input", () => {
    if (input === els.listedGross) {
      const cursorAtEnd = input.selectionStart === input.value.length;
      formatMoneyInput(input);
      if (cursorAtEnd) input.setSelectionRange(input.value.length, input.value.length);
      syncBaseFromGross();
    }
    render();
  });
  input.addEventListener("change", () => {
    if (input.matches?.("[data-money-input]")) {
      formatMoneyInput(input);
    }
    if (input === els.listedGross) {
      syncBaseFromGross();
    }
    render();
  });
});

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    activeScenario = button.dataset.scenario;
    document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});

els.resetBtn.addEventListener("click", resetDefaults);

els.copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lastQuoteText);
    showToast("Da copy bao gia");
  } catch {
    showToast("Khong copy duoc tren trinh duyet nay");
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

syncBaseFromGross();
document.querySelectorAll("[data-money-input]").forEach(formatMoneyInput);
render();
