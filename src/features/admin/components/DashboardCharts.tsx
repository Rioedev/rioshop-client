import { Card, Typography } from "antd";

const { Text, Title } = Typography;

export type LineChartPoint = {
  label: string;
  value: number;
};

export type OrdersColumnPoint = {
  label: string;
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
};

export type DonutPoint = {
  label: string;
  value: number;
  color: string;
};

export type RankBarPoint = {
  label: string;
  value: number;
  helper?: string;
};

type ValueFormatter = (value: number) => string;

const defaultFormatValue: ValueFormatter = (value) =>
  new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(value || 0)));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function DashboardLineChartCard(props: {
  title: string;
  subtitle?: string;
  data: LineChartPoint[];
  valueFormatter?: ValueFormatter;
  strokeColor?: string;
}) {
  const {
    title,
    subtitle,
    data,
    valueFormatter = defaultFormatValue,
    strokeColor = "#2563eb",
  } = props;

  if (data.length === 0) {
    return (
      <Card className="border-slate-200! shadow-sm! h-full">
        <Title level={5} className="m-0!">
          {title}
        </Title>
        {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Chưa có dữ liệu biểu đồ.
        </div>
      </Card>
    );
  }

  const width = 760;
  const height = 280;
  const paddingX = 34;
  const paddingY = 28;

  const values = data.map((item) => Number(item.value || 0));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x =
      data.length <= 1
        ? width / 2
        : paddingX + (index * (width - paddingX * 2)) / (data.length - 1);
    const y =
      paddingY +
      ((maxValue - Number(item.value || 0)) / valueRange) *
        (height - paddingY * 2);

    return {
      x,
      y,
      value: Number(item.value || 0),
      label: item.label,
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x} ${height - paddingY} L ${firstPoint.x} ${height - paddingY} Z`;

  const visibleLabelStep = Math.max(1, Math.ceil(data.length / 7));
  const currentValue = points[points.length - 1]?.value ?? 0;

  return (
    <Card className="border-slate-200! shadow-sm! h-full">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Title level={5} className="m-0!">
            {title}
          </Title>
          {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-1 text-right">
          <p className="m-0 text-xs text-blue-700">Hiện tại</p>
          <p className="m-0 text-sm font-bold text-blue-900">{valueFormatter(currentValue)}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible">
        {[0, 1, 2, 3, 4].map((step) => {
          const y = paddingY + (step * (height - paddingY * 2)) / 4;
          return (
            <line
              key={`grid-${step}`}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
          );
        })}

        <path d={areaPath} fill={strokeColor} opacity={0.12} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={3} strokeLinecap="round" />

        {points.map((point, index) => {
          const isEdge = index === points.length - 1 || index === 0;
          if (!isEdge && index % visibleLabelStep !== 0) {
            return null;
          }

          return (
            <circle
              key={`point-${point.label}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 4.8 : 3.2}
              fill={strokeColor}
            />
          );
        })}
      </svg>

      <div className="mt-2 grid grid-cols-7 gap-2 text-center text-[11px] text-slate-500">
        {points
          .filter((_, index) => index % visibleLabelStep === 0 || index === points.length - 1)
          .slice(0, 7)
          .map((point) => (
            <span key={`label-${point.label}`}>{point.label}</span>
          ))}
      </div>
    </Card>
  );
}

export function DashboardOrdersColumnCard(props: {
  title: string;
  subtitle?: string;
  data: OrdersColumnPoint[];
}) {
  const { title, subtitle, data } = props;

  if (data.length === 0) {
    return (
      <Card className="border-slate-200! shadow-sm! h-full">
        <Title level={5} className="m-0!">
          {title}
        </Title>
        {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Chưa có dữ liệu biểu đồ.
        </div>
      </Card>
    );
  }

  const visibleData = data.slice(-14);
  const maxTotal = Math.max(...visibleData.map((item) => item.total), 1);
  const labelStep = Math.max(1, Math.ceil(visibleData.length / 7));

  return (
    <Card className="border-slate-200! shadow-sm! h-full">
      <Title level={5} className="m-0!">
        {title}
      </Title>
      {subtitle ? <Text type="secondary">{subtitle}</Text> : null}

      <div className="mt-6 flex h-56 items-end gap-1.5">
        {visibleData.map((item, index) => {
          const totalHeight = clamp((item.total / maxTotal) * 100, 2, 100);
          const pendingHeight = item.total > 0 ? (item.pending / item.total) * totalHeight : 0;
          const completedHeight = item.total > 0 ? (item.completed / item.total) * totalHeight : 0;
          const cancelledHeight = Math.max(totalHeight - pendingHeight - completedHeight, 0);

          return (
            <div key={`${item.label}-${index}`} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full items-end justify-center">
                <div className="flex h-48 w-full max-w-5 flex-col justify-end overflow-hidden rounded-t-sm bg-slate-100">
                  <div style={{ height: `${cancelledHeight}%` }} className="bg-rose-400" />
                  <div style={{ height: `${pendingHeight}%` }} className="bg-amber-400" />
                  <div style={{ height: `${completedHeight}%` }} className="bg-emerald-500" />
                </div>
                <div className="pointer-events-none absolute -top-7 hidden rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
                  {item.total} đơn
                </div>
              </div>
              <span className={`text-[10px] ${index % labelStep === 0 || index === visibleData.length - 1 ? "text-slate-500" : "text-transparent"}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Hoàn thành
        </span>
        <span className="inline-flex items-center gap-1 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Chờ xử lý
        </span>
        <span className="inline-flex items-center gap-1 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Hủy/Hoàn
        </span>
      </div>
    </Card>
  );
}

export function DashboardDonutCard(props: {
  title: string;
  subtitle?: string;
  data: DonutPoint[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const { title, subtitle, data, centerLabel, centerValue } = props;

  const normalizedData = data
    .map((item) => ({
      ...item,
      value: Math.max(0, Number(item.value || 0)),
    }))
    .filter((item) => item.value > 0);

  const safeData =
    normalizedData.length > 0
      ? normalizedData
      : [{ label: "Chưa có dữ liệu", value: 1, color: "#cbd5e1" }];

  const total = safeData.reduce((sum, item) => sum + item.value, 0);

  const stops = safeData.reduce<Array<{ color: string; start: number; end: number }>>((acc, item) => {
    const last = acc[acc.length - 1];
    const start = last ? last.end : 0;
    const end = start + (item.value / total) * 100;
    acc.push({ color: item.color, start, end });
    return acc;
  }, []);

  const gradient = stops
    .map((stop) => `${stop.color} ${stop.start}% ${stop.end}%`)
    .join(", ");

  return (
    <Card className="border-slate-200! shadow-sm! h-full">
      <Title level={5} className="m-0!">
        {title}
      </Title>
      {subtitle ? <Text type="secondary">{subtitle}</Text> : null}

      <div className="mt-5 flex flex-wrap items-center gap-5">
        <div
          className="relative h-40 w-40 rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="absolute inset-5 rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <Text className="text-[11px]! text-slate-500!">{centerLabel || "Tổng"}</Text>
            <Text className="text-lg! font-black! text-slate-900!">{centerValue || defaultFormatValue(total)}</Text>
          </div>
        </div>

        <div className="min-w-[200px] flex-1 space-y-2">
          {safeData.map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
                <span className="font-semibold text-slate-900">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export function DashboardRankBarCard(props: {
  title: string;
  subtitle?: string;
  data: RankBarPoint[];
  valueFormatter?: ValueFormatter;
}) {
  const { title, subtitle, data, valueFormatter = defaultFormatValue } = props;

  if (data.length === 0) {
    return (
      <Card className="border-slate-200! shadow-sm! h-full">
        <Title level={5} className="m-0!">
          {title}
        </Title>
        {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Chưa có dữ liệu xếp hạng.
        </div>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card className="border-slate-200! shadow-sm! h-full">
      <Title level={5} className="m-0!">
        {title}
      </Title>
      {subtitle ? <Text type="secondary">{subtitle}</Text> : null}

      <div className="mt-5 space-y-3">
        {data.map((item, index) => {
          const pct = clamp((item.value / maxValue) * 100, 4, 100);
          return (
            <div key={`${item.label}-${index}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Text className="line-clamp-1 max-w-[72%] text-slate-700!">{item.label}</Text>
                <Text strong>{valueFormatter(item.value)}</Text>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-600 to-cyan-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {item.helper ? <Text type="secondary" className="text-xs!">{item.helper}</Text> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
