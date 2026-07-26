interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon = '📡', title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
      <span className="text-3xl opacity-40">{icon}</span>
      <p className="text-gray-400 font-medium">{title}</p>
      {subtitle && <p className="text-gray-600 text-sm max-w-xs">{subtitle}</p>}
    </div>
  );
}
