import { useLocation, useNavigate } from 'react-router-dom';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ROUTES } from '@/constants';

const TABS: Array<{ value: string; label: string }> = [
  { value: ROUTES.APP_FINANCE, label: 'Overview' },
  { value: ROUTES.APP_FINANCE_MONEY_RECEIVED, label: 'Received' },
  { value: ROUTES.APP_FINANCE_MONEY_SPENT, label: 'Spent' },
  { value: ROUTES.APP_FINANCE_CASHBOOK, label: 'Cashbook' },
];

export function FinanceTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active =
    TABS.find((tab) => tab.value === pathname)?.value ?? ROUTES.APP_FINANCE;

  return (
    <SegmentedControl
      options={TABS}
      value={active}
      onChange={(value) => navigate(value)}
      ariaLabel="Finance views"
      className="-mt-2 mb-5"
    />
  );
}
