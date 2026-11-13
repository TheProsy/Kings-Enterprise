import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { REPORT_PERIOD_OPTIONS, type ReportPeriod } from '@/lib/reporting';

interface ReportPeriodSelectProps {
  value: ReportPeriod;
  onChange: (value: ReportPeriod) => void;
  className?: string;
}

export function ReportPeriodSelect({ value, onChange, className }: ReportPeriodSelectProps) {
  return (
    <SegmentedControl
      options={REPORT_PERIOD_OPTIONS}
      value={value}
      onChange={onChange}
      size="sm"
      ariaLabel="Report period"
      className={className}
    />
  );
}
