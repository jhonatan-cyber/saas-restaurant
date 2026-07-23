import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  DashboardIcon,
  PosIcon,
  KdsIcon,
  ReceiptIcon,
  BranchIcon,
  CashIcon,
  CashMovementIcon,
  TagIcon,
  BoxIcon,
  TruckIcon,
  PackageIcon,
  InventoryIcon,
  ReportsIcon,
  AuditIcon,
  FireIcon,
  TableIcon,
  UsersIcon,
  UserManagementIcon,
  SettingsIcon,
  PlanIcon,
  MenuIcon,
  LogoutIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  CollapseIcon,
  ChevronDownIcon,
  SearchIcon,
  BarcodeIcon,
  CloseIcon,
  PlusSmallIcon,
  RefreshIcon,
  ChevronDownSolidIcon,
  PlusIcon,
  GridIcon,
  CheckIcon,
} from '../icons';

// Each icon component renders an <svg> element.
// This smoke test verifies they render without crashing and produce an SVG.

function expectSvg(container: HTMLElement): void {
  const svg = container.querySelector('svg');
  expect(svg).toBeInTheDocument();
  expect(svg).toHaveAttribute('viewBox');
}

describe('icons.tsx — smoke tests', () => {
  // ── Simple icons (no props required) ─────────────────────────────────

  const simpleIcons: Array<[string, () => React.ReactElement]> = [
    ['DashboardIcon', () => <DashboardIcon />],
    ['PosIcon', () => <PosIcon />],
    ['KdsIcon', () => <KdsIcon />],
    ['ReceiptIcon', () => <ReceiptIcon />],
    ['BranchIcon', () => <BranchIcon />],
    ['CashIcon', () => <CashIcon />],
    ['CashMovementIcon', () => <CashMovementIcon />],
    ['TagIcon', () => <TagIcon />],
    ['BoxIcon', () => <BoxIcon />],
    ['TruckIcon', () => <TruckIcon />],
    ['PackageIcon', () => <PackageIcon />],
    ['InventoryIcon', () => <InventoryIcon />],
    ['ReportsIcon', () => <ReportsIcon />],
    ['AuditIcon', () => <AuditIcon />],
    ['FireIcon', () => <FireIcon />],
    ['TableIcon', () => <TableIcon />],
    ['UsersIcon', () => <UsersIcon />],
    ['UserManagementIcon', () => <UserManagementIcon />],
    ['SettingsIcon', () => <SettingsIcon />],
    ['PlanIcon', () => <PlanIcon />],
    ['MenuIcon', () => <MenuIcon />],
    ['LogoutIcon', () => <LogoutIcon />],
    ['SunIcon', () => <SunIcon />],
    ['MoonIcon', () => <MoonIcon />],
    ['UserIcon', () => <UserIcon />],
    ['ChevronDownIcon', () => <ChevronDownIcon />],
    ['SearchIcon', () => <SearchIcon />],
    ['BarcodeIcon', () => <BarcodeIcon />],
    ['CloseIcon', () => <CloseIcon />],
    ['PlusSmallIcon', () => <PlusSmallIcon />],
    ['RefreshIcon', () => <RefreshIcon />],
    ['ChevronDownSolidIcon', () => <ChevronDownSolidIcon />],
    ['PlusIcon', () => <PlusIcon />],
    ['GridIcon', () => <GridIcon />],
    ['CheckIcon', () => <CheckIcon />],
  ];

  it.each(simpleIcons)('%s renders an SVG', (_name, renderFn) => {
    const { container } = render(renderFn());
    expectSvg(container);
  });

  // ── CollapseIcon (requires `open` prop) ─────────────────────────────

  it('CollapseIcon renders an SVG when open=true', () => {
    const { container } = render(<CollapseIcon open />);
    expectSvg(container);
  });

  it('CollapseIcon renders an SVG when open=false', () => {
    const { container } = render(<CollapseIcon open={false} />);
    expectSvg(container);
    // Should NOT have rotate-180 class when closed
    const svg = container.querySelector('svg');
    expect(svg?.className?.toString()).not.toContain('rotate-180');
  });

  // ── Custom className passthrough ─────────────────────────────────────

  it.each([
    'DashboardIcon', 'UserIcon', 'ChevronDownSolidIcon', 'GridIcon',
  ])('%s passes custom className to the SVG', (_name) => {
    const components: Record<string, React.ReactElement> = {
      DashboardIcon: <DashboardIcon className="custom-test-class" />,
      UserIcon: <UserIcon className="custom-test-class" />,
      ChevronDownSolidIcon: <ChevronDownSolidIcon className="custom-test-class" />,
      GridIcon: <GridIcon className="custom-test-class" />,
    };
    const { container } = render(components[_name]);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('custom-test-class');
  });
});
