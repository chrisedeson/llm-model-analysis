interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  color?: "blue" | "green" | "purple" | "orange" | "red" | "gray";
}

const colorClasses = {
  blue: "bg-[#5E6AD2]/15 text-[#5E6AD2]",
  green: "bg-[#4CAF79]/15 text-[#4CAF79]",
  purple: "bg-[#9D5BD2]/15 text-[#9D5BD2]",
  orange: "bg-[#F59E0B]/15 text-[#F59E0B]",
  red: "bg-[#E5484D]/15 text-[#E5484D]",
  gray: "bg-white/10 text-white/60",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "blue",
}: StatCardProps) {
  return (
    <div className="bg-[#141517] rounded-xl border border-white/[0.08] p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-white tracking-tight truncate">{value}</p>
          {subtitle && (
            <p className="mt-1 text-[13px] text-white/50">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`text-[13px] font-medium ${
                  trend.isPositive ? "text-[#4CAF79]" : "text-[#E5484D]"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-[13px] text-white/30">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
