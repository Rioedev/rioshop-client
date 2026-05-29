import { useEffect, useState, type ReactNode } from "react";
import {
  ClockCircleOutlined,
  CrownOutlined,
  CustomerServiceOutlined,
  GiftOutlined,
  HeartOutlined,
  MailOutlined,
  PhoneOutlined,
  RetweetOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { policyService, type Policy } from "../services/policyService";

const ICON_MAP: Record<string, ReactNode> = {
  RetweetOutlined: <RetweetOutlined />,
  TruckOutlined: <TruckOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  GiftOutlined: <GiftOutlined />,
  HeartOutlined: <HeartOutlined />,
  CrownOutlined: <CrownOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  PhoneOutlined: <PhoneOutlined />,
  MailOutlined: <MailOutlined />,
  CustomerServiceOutlined: <CustomerServiceOutlined />,
};

export function StorePolicyStrip() {
  const [items, setItems] = useState<Policy[]>([]);

  useEffect(() => {
    let active = true;
    void policyService
      .listActiveByKind("strip")
      .then((docs) => {
        if (active) setItems(docs);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="store-policy-strip">
      <div className="mx-auto flex w-full max-w-440 flex-wrap items-center justify-center gap-x-8 gap-y-2 px-3 py-2 text-sm sm:px-4 xl:px-6">
        {items.map((item) => (
          <span key={item._id} className="store-policy-item inline-flex items-center gap-2 text-slate-700">
            <span style={{ color: "#0f4fa8" }}>{ICON_MAP[item.iconKey] ?? <SafetyCertificateOutlined />}</span>
            <span className="font-semibold">{item.title}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
