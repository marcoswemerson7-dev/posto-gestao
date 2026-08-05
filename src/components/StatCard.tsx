import type { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'orange' | 'red';
};

export default function StatCard({ title, value, subtitle, icon: Icon, tone = 'blue' }: Props) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={21} /></div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  );
}
