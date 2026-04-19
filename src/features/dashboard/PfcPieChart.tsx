import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { PfcRatios } from '../../domain/pfc'

const COLORS = {
  P: '#10b981', // emerald-500
  F: '#f59e0b', // amber-500
  C: '#0ea5e9', // sky-500
}

interface PfcPieChartProps {
  ratios: PfcRatios
}

export function PfcPieChart({ ratios }: PfcPieChartProps) {
  const total = ratios.p_ratio + ratios.f_ratio + ratios.c_ratio
  const data =
    total > 0
      ? [
          { name: 'P', value: ratios.p_ratio, color: COLORS.P },
          { name: 'F', value: ratios.f_ratio, color: COLORS.F },
          { name: 'C', value: ratios.c_ratio, color: COLORS.C },
        ]
      : [{ name: 'empty', value: 1, color: '#e2e8f0' }]

  return (
    <div className="w-28 h-28">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={28}
            outerRadius={52}
            dataKey="value"
            isAnimationActive={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
