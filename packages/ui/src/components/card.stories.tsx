import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    className: 'p-6',
    children: (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-900">Revenue snapshot</p>
        <p className="text-sm text-slate-600">
          Shared surface styles for dashboards, forms and dialogs.
        </p>
      </div>
    ),
  },
};
