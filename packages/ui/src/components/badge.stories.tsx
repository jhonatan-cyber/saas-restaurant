import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Neutral: Story = {
  args: {
    children: 'Draft',
    variant: 'neutral',
  },
};

export const Success: Story = {
  args: {
    children: 'Active',
    variant: 'success',
  },
};
