import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  icon: ReactNode;
  color?: "blue" | "green" | "purple" | "orange";
}

const colorSchemes = {
  blue: {
    bg: "from-blue-50 to-blue-100",
    icon: "text-blue-600",
    border: "border-blue-200",
  },
  green: {
    bg: "from-green-50 to-green-100",
    icon: "text-green-600",
    border: "border-green-200",
  },
  purple: {
    bg: "from-purple-50 to-purple-100",
    icon: "text-purple-600",
    border: "border-purple-200",
  },
  orange: {
    bg: "from-orange-50 to-orange-100",
    icon: "text-orange-600",
    border: "border-orange-200",
  },
};

const StatCard = ({ title, value, icon, color = "blue" }: Props) => {
  const scheme = colorSchemes[color];

  return (
    <div
      className={`bg-gradient-to-br ${scheme.bg} rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-6 flex justify-between items-start border ${scheme.border}`}
    >
      <div className="flex-1">
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <h2 className="text-3xl font-bold mt-2 text-gray-900">{value}</h2>
      </div>
      <div className={`text-5xl ${scheme.icon} opacity-20`}>{icon}</div>
    </div>
  );
};

export default StatCard;
