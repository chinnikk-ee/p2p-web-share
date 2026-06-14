import { motion } from 'framer-motion';
import { Progress } from '@p2p/ui';

interface ProgressMeterProps {
  /** 0..1 */
  percent: number;
  label?: string;
}

export function ProgressMeter({ percent, label = 'Progress' }: ProgressMeterProps) {
  const pct = Math.min(100, Math.max(0, Math.round(percent * 100)));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <motion.span
          key={pct}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold tabular-nums text-gradient"
        >
          {pct}%
        </motion.span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
