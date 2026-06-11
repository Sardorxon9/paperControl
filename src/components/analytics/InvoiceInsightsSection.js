// InvoiceInsightsSection.js
// Self-contained analytics section: invoice revenue trend,
// top paper-performance clients, and inactive-client detection.
// Drops into Analytics.js as a single component. Does its own data fetch so it
// does not depend on the parent page's existing state.
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  Box, Card, Stack, Typography, ToggleButton, ToggleButtonGroup,
  Switch, FormControlLabel, CircularProgress, Chip, Tooltip
} from "@mui/material";
import {
  ArrowUpward, ArrowDownward,
  Inventory2, NotificationsOff
} from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  format, subDays, isAfter, formatDistanceToNow
} from "date-fns";
import { ru } from "date-fns/locale";

const TEAL = "#0F9D8C";
const NAVY = "#1f2a44";
const AMBER = "#E8A33D";
const RED = "#E5484D";
const PUREPACK = "#7C5CFF"; // Pure Pack line
const WHITERAY = TEAL;      // White Ray line

const fmtUZS = (n) => Math.round(n || 0).toLocaleString("ru-RU");
const fmtKg = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString("ru-RU");
const toDate = (d) => (d?.toDate ? d.toDate() : d ? new Date(d) : null);

// Period presets for the line graph X axis.
const PERIODS = {
  "1w": { label: "1 неделя", days: 7, bucket: "day" },
  "1m": { label: "1 месяц", days: 30, bucket: "day" },     // default
  "1y": { label: "1 год", days: 365, bucket: "month" },
};

const SILENT_PERIODS = {
  90: "3 месяца",
  180: "6 месяцев",
  365: "1 год",
};

export default function InvoiceInsightsSection() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [paperByClient, setPaperByClient] = useState({}); // id -> {in,out,last}
  const [productNames, setProductNames] = useState({}); // products doc id -> productName
  const [packageNames, setPackageNames] = useState({}); // packageTypes doc id -> type

  const [period, setPeriod] = useState("1m");
  const [splitByOrg, setSplitByOrg] = useState(false);
  const [silentDays, setSilentDays] = useState(90);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [invSnap, cliSnap, prodSnap, pkgSnap] = await Promise.all([
          getDocs(collection(db, "all-invoices")),
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "products")),
          getDocs(collection(db, "packageTypes")),
        ]);
        const inv = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const cli = cliSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Lookup maps: doc id -> readable name.
        const prodMap = {};
        prodSnap.docs.forEach((d) => { prodMap[d.id] = d.data().productName || ""; });
        const pkgMap = {};
        pkgSnap.docs.forEach((d) => { pkgMap[d.id] = d.data().type || ""; });

        // Paper logs per client (bought / spent / last activity).
        const paper = {};
        await Promise.all(
          cli.map(async (c) => {
            const logSnap = await getDocs(collection(db, "clients", c.id, "logs"));
            let bought = 0, spent = 0, last = null;
            logSnap.docs.forEach((l) => {
              const d = l.data();
              const amt = Number(d.amount) || 0;
              const dt = toDate(d.date);
              if (d.actionType === "paperIn") bought += amt;
              else if (d.actionType === "paperOut") spent += amt;
              if (dt && (!last || dt > last)) last = dt;
            });
            paper[c.id] = { bought, spent, last };
          })
        );

        setInvoices(inv);
        setClients(cli);
        setPaperByClient(paper);
        setProductNames(prodMap);
        setPackageNames(pkgMap);
      } catch (e) {
        console.error("InvoiceInsights fetch error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- LINE GRAPH: invoice sum over time ----------
  const lineData = useMemo(() => {
    const cfg = PERIODS[period];
    const end = startOfDay(new Date());
    const start = subDays(end, cfg.days);
    let buckets;
    if (cfg.bucket === "day") buckets = eachDayOfInterval({ start, end });
    else if (cfg.bucket === "week") buckets = eachWeekOfInterval({ start, end });
    else buckets = eachMonthOfInterval({ start, end });

    const keyFor = (dt) =>
      cfg.bucket === "month" ? format(dt, "yyyy-MM") : format(dt, "yyyy-MM-dd");
    const labelFor = (dt) =>
      cfg.bucket === "month"
        ? format(dt, "LLL yy", { locale: ru })
        : format(dt, "d MMM", { locale: ru });

    const total = {}, pp = {}, wr = {};
    buckets.forEach((b) => { const k = keyFor(b); total[k] = 0; pp[k] = 0; wr[k] = 0; });

    invoices.forEach((i) => {
      const dt = toDate(i.dateCreated);
      if (!dt || dt < start) return;
      const k = keyFor(dt);
      if (!(k in total)) return;
      const amt = Number(i.totalInvoiceAmount) || 0;
      total[k] += amt;
      if (i.senderCompany === "Pure Pack") pp[k] += amt;
      else if (i.senderCompany === "White Ray") wr[k] += amt;
    });

    const labels = buckets.map(labelFor);
    const keys = buckets.map(keyFor);
    return {
      labels,
      total: keys.map((k) => total[k]),
      pp: keys.map((k) => pp[k]),
      wr: keys.map((k) => wr[k]),
    };
  }, [invoices, period]);

  // ---------- HEADLINE: this period vs previous ----------
  const headline = useMemo(() => {
    const cfg = PERIODS[period];
    const now = new Date();
    const curStart = subDays(now, cfg.days);
    const prevStart = subDays(now, cfg.days * 2);
    let cur = 0, prev = 0;
    invoices.forEach((i) => {
      const dt = toDate(i.dateCreated);
      if (!dt) return;
      const amt = Number(i.totalInvoiceAmount) || 0;
      if (dt >= curStart) cur += amt;
      else if (dt >= prevStart && dt < curStart) prev += amt;
    });
    const pct = prev > 0 ? ((cur - prev) / prev) * 100 : null;
    const periodLabel =
      period === "1y" ? "за последний год"
        : period === "1w" ? "за последнюю неделю"
          : "за последний месяц";
    return { cur, prev, pct, periodLabel };
  }, [invoices, period]);

  // ---------- TOP paper-performance clients ----------
  const topPaper = useMemo(() => {
    const rows = clients.map((c) => {
      const p = paperByClient[c.id] || { bought: 0, spent: 0 };
      // Standard design stores readable names; unique/legacy stores doc IDs we resolve via maps.
      const product = c.productName || productNames[c.productID_2] || "";
      const pkg = c.packageType || packageNames[c.packageID] || "";
      return { name: c.restaurant || c.name || "—", product, pkg, bought: p.bought, spent: p.spent };
    }).filter((r) => r.spent > 0 || r.bought > 0);
    rows.sort((a, b) => b.spent - a.spent);
    return rows.slice(0, 7);
  }, [clients, paperByClient, productNames, packageNames]);
  const maxSpent = Math.max(1, ...topPaper.map((r) => r.spent));

  // ---------- SILENT clients ----------
  const silent = useMemo(() => {
    const cutoff = subDays(new Date(), silentDays);
    const lastInvByClient = {};
    invoices.forEach((i) => {
      if (!i.clientId) return;
      const dt = toDate(i.dateCreated);
      if (dt && (!lastInvByClient[i.clientId] || dt > lastInvByClient[i.clientId]))
        lastInvByClient[i.clientId] = dt;
    });
    const list = clients
      .map((c) => {
        const p = paperByClient[c.id] || {};
        const lastPaper = p.last || null;
        const lastInv = lastInvByClient[c.id] || null;
        const lastAny = [lastPaper, lastInv].filter(Boolean).sort((a, b) => b - a)[0] || null;
        return { name: c.restaurant || c.name || "—", shellNum: c.shellNum, lastAny };
      })
      .filter((c) => !c.lastAny || !isAfter(c.lastAny, cutoff))
      .sort((a, b) => {
        if (!a.lastAny) return 1;
        if (!b.lastAny) return -1;
        return a.lastAny - b.lastAny; // most-silent first
      });
    return list;
  }, [clients, invoices, paperByClient, silentDays]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300} gap={2}>
        <CircularProgress sx={{ color: TEAL }} />
        <Typography color="text.secondary">Загрузка аналитики счетов…</Typography>
      </Box>
    );
  }

  // ---------- chart config ----------
  const datasets = splitByOrg
    ? [
        mkLine("White Ray", lineData.wr, WHITERAY),
        mkLine("Pure Pack", lineData.pp, PUREPACK),
      ]
    : [mkLine("Все счета", lineData.total, TEAL, true)];

  const chartData = { labels: lineData.labels, datasets };
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: splitByOrg, position: "top", labels: { usePointStyle: true, font: { size: 13 } } },
      tooltip: {
        backgroundColor: "rgba(20,20,30,.92)", padding: 12, cornerRadius: 10,
        callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtUZS(c.parsed.y)} сум` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, font: { size: 12 } } },
      y: {
        grid: { color: "rgba(0,0,0,.05)" },
        ticks: { callback: (v) => (v >= 1e6 ? v / 1e6 + "M" : v / 1e3 + "k"), font: { size: 12 } },
      },
    },
  };

  const pctUp = headline.pct != null && headline.pct >= 0;

  return (
    <Box sx={{ mb: 6 }}>
      {/* ============ INVOICE TREND CARD ============ */}
      <Card sx={cardSx}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-start" }} spacing={2}>
          {/* Headline */}
          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
              Сумма созданных накладных · {headline.periodLabel}
            </Typography>
            <Tooltip title={`Создано накладных на сумму: ${fmtUZS(headline.cur)} сум`}>
              <Typography sx={{ fontSize: { xs: 34, md: 44 }, fontWeight: 800, lineHeight: 1.05, color: NAVY, display: "inline-block", cursor: "default" }}>
                {fmtUZS(headline.cur)} <Typography component="span" sx={{ fontSize: 20, fontWeight: 600, color: "text.secondary" }}>сум</Typography>
              </Typography>
            </Tooltip>
            {headline.pct != null && (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                {pctUp ? <ArrowUpward sx={{ fontSize: 18, color: TEAL }} /> : <ArrowDownward sx={{ fontSize: 18, color: RED }} />}
                <Typography sx={{ fontWeight: 700, color: pctUp ? TEAL : RED }}>
                  {pctUp ? "+" : ""}{headline.pct.toFixed(1)}%
                </Typography>
                <Typography sx={{ color: "text.secondary" }}>к прошлому периоду</Typography>
              </Stack>
            )}
          </Box>

          {/* Controls */}
          <Stack spacing={1.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
            <ToggleButtonGroup
              value={period} exclusive size="small"
              onChange={(_, v) => v && setPeriod(v)}
              sx={tgSx}
            >
              {Object.entries(PERIODS).map(([k, v]) => (
                <ToggleButton key={k} value={k}>{v.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            <FormControlLabel
              control={<Switch checked={splitByOrg} onChange={(e) => setSplitByOrg(e.target.checked)} sx={{ "& .Mui-checked": { color: TEAL }, "& .Mui-checked + .MuiSwitch-track": { bgcolor: TEAL + "!important" } }} />}
              label={<Typography sx={{ fontSize: 14, fontWeight: 600 }}>Разделить по организации</Typography>}
            />
          </Stack>
        </Stack>

        <Box sx={{ height: { xs: 280, md: 340 }, mt: 2 }}>
          <Line data={chartData} options={chartOpts} />
        </Box>
      </Card>

      {/* ============ PAPER PERFORMANCE ============ */}
      <Box sx={{ mt: 3 }}>
        {/* Top paper performance */}
        <Card sx={cardSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Inventory2 sx={{ color: TEAL }} />
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: NAVY }}>Лидеры по бумаге</Typography>
          </Stack>

          {/* Column headers for the two paper metrics */}
          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={3}
            sx={{ mb: 1, pr: 0.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={0.4} sx={{ width: 150, justifyContent: "flex-end" }}>
              <ArrowUpward sx={{ fontSize: 14, color: RED }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: RED }}>Всего израсходовано</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.4} sx={{ width: 150, justifyContent: "flex-end" }}>
              <ArrowDownward sx={{ fontSize: 14, color: TEAL }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: TEAL }}>Всего куплено бумаги</Typography>
            </Stack>
          </Stack>

          <Stack spacing={1.75}>
            {topPaper.map((r, i) => (
              <Box key={r.name + i}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ mb: 0.25 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>
                      {i + 1}. {r.name}
                    </Typography>
                    {(r.product || r.pkg) && (
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {[r.product, r.pkg].filter(Boolean).join(" · ")}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={3} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Typography sx={{ width: 150, textAlign: "right", fontWeight: 800, fontSize: 15, color: NAVY }}>
                      {fmtKg(r.spent)} кг
                    </Typography>
                    <Typography sx={{ width: 150, textAlign: "right", fontWeight: 600, fontSize: 14, color: "text.secondary" }}>
                      {fmtKg(r.bought)} кг
                    </Typography>
                  </Stack>
                </Stack>
                <Box sx={{ height: 10, borderRadius: 5, bgcolor: "#eef1f5", overflow: "hidden", mt: 0.5 }}>
                  <Box sx={{ height: "100%", width: `${(r.spent / maxSpent) * 100}%`, bgcolor: TEAL, borderRadius: 5, transition: "width .4s" }} />
                </Box>
              </Box>
            ))}
          </Stack>
        </Card>
      </Box>

      {/* ============ SILENT CLIENTS ============ */}
      <Card sx={{ ...cardSx, mt: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <NotificationsOff sx={{ color: AMBER }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: NAVY }}>Не активные клиенты</Typography>
              <Typography variant="caption" color="text.secondary">
                Клиенты без созданных накладных, без обновлений бумаг за долгий период · <b>{silent.length}</b> клиентов
              </Typography>
            </Box>
          </Stack>
          <ToggleButtonGroup
            value={silentDays} exclusive size="small"
            onChange={(_, v) => v && setSilentDays(v)}
            sx={tgSx}
          >
            {Object.entries(SILENT_PERIODS).map(([d, l]) => (
              <ToggleButton key={d} value={Number(d)}>{l}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {silent.length === 0 ? (
          <Typography color="text.secondary">Молчащих клиентов нет 🎉</Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 1.5, maxHeight: 360, overflowY: "auto", pr: 1 }}>
            {silent.map((c, i) => (
              <Stack key={c.name + i} direction="row" justifyContent="space-between" alignItems="center"
                sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "#fff8ef", border: "1px solid #f3e3c8" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.lastAny
                      ? `Последняя активность ${formatDistanceToNow(c.lastAny, { locale: ru, addSuffix: true })}, ${format(c.lastAny, "d MMM yyyy", { locale: ru })}`
                      : "Активности нет"}
                  </Typography>
                </Box>
                {c.shellNum ? <Chip size="small" label={c.shellNum} sx={{ bgcolor: "#fff", border: "1px solid #e7d4ad", fontWeight: 600 }} /> : null}
              </Stack>
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
}

// ---- helpers ----
function mkLine(label, data, color, fill = false) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: fill ? color + "22" : color + "11",
    fill: true,
    tension: 0.35,
    borderWidth: 2.5,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: color,
  };
}

const cardSx = {
  p: { xs: 2.5, md: 3.5 },
  borderRadius: 4,
  boxShadow: "0 4px 24px -8px rgba(20,30,60,.12)",
  border: "1px solid #eef1f5",
};

const tgSx = {
  "& .MuiToggleButton-root": {
    px: 2, py: 0.6, textTransform: "none", fontWeight: 600, color: "#667085",
    borderColor: "#e4e8ee",
    "&.Mui-selected": { bgcolor: "#0F9D8C", color: "#fff", "&:hover": { bgcolor: "#0c7a6e" } },
  },
};
