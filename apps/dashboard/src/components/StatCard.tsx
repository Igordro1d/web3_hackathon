interface StatCardProps {
  label: string;
  value: string;
  accent?: 'green' | 'blue' | 'gray';
}

const accentClasses = {
  green: 'text-green-400',
  blue: 'text-blue-400',
  gray: 'text-gray-100',
};

export function StatCard({ label, value, accent = 'gray' }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accentClasses[accent]}`}>{value}</p>
    </div>
  );
}
