import { OrderStatus } from '@prisma/client';
import {
  canTransition,
  allowedTransitions,
  isTerminal,
  isEditable,
  TERMINAL_STATUSES,
  ACTIVE_STATUSES,
  KDS_VISIBLE_STATUSES,
} from './order-state-machine';

describe('OrderStateMachine', () => {
  describe('canTransition', () => {
    it('PENDING → SENT_TO_KITCHEN', () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.SENT_TO_KITCHEN)).toBe(true);
    });

    it('PENDING → CANCELLED', () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
    });

    it('SENT_TO_KITCHEN → IN_PREPARATION', () => {
      expect(canTransition(OrderStatus.SENT_TO_KITCHEN, OrderStatus.IN_PREPARATION)).toBe(true);
    });

    it('SENT_TO_KITCHEN → CANCELLED', () => {
      expect(canTransition(OrderStatus.SENT_TO_KITCHEN, OrderStatus.CANCELLED)).toBe(true);
    });

    it('IN_PREPARATION → READY', () => {
      expect(canTransition(OrderStatus.IN_PREPARATION, OrderStatus.READY)).toBe(true);
    });

    it('IN_PREPARATION → CANCELLED', () => {
      expect(canTransition(OrderStatus.IN_PREPARATION, OrderStatus.CANCELLED)).toBe(true);
    });

    it('READY → DELIVERED', () => {
      expect(canTransition(OrderStatus.READY, OrderStatus.DELIVERED)).toBe(true);
    });

    it('READY → CANCELLED', () => {
      expect(canTransition(OrderStatus.READY, OrderStatus.CANCELLED)).toBe(true);
    });

    it('DELIVERED → PAID', () => {
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.PAID)).toBe(true);
    });

    // Invalid transitions
    it('DRAFT cannot transition to anything', () => {
      expect(canTransition(OrderStatus.DRAFT, OrderStatus.PENDING)).toBe(false);
      expect(canTransition(OrderStatus.DRAFT, OrderStatus.CANCELLED)).toBe(false);
    });

    it('PAID is terminal — no transitions out', () => {
      expect(canTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(false);
      expect(canTransition(OrderStatus.PAID, OrderStatus.DELIVERED)).toBe(false);
    });

    it('CANCELLED is terminal — no transitions out', () => {
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(false);
    });

    it('cannot skip states: PENDING → PAID is invalid', () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.PAID)).toBe(false);
    });

    it('cannot skip kitchen: PENDING → READY is invalid', () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.READY)).toBe(false);
    });

    it('cannot go backwards: DELIVERED → READY is invalid', () => {
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.READY)).toBe(false);
    });

    it('cannot go backwards: IN_PREPARATION → SENT_TO_KITCHEN is invalid', () => {
      expect(canTransition(OrderStatus.IN_PREPARATION, OrderStatus.SENT_TO_KITCHEN)).toBe(false);
    });
  });

  describe('allowedTransitions', () => {
    it('returns destinations for PENDING', () => {
      const dests = allowedTransitions(OrderStatus.PENDING);
      expect(dests).toContain(OrderStatus.SENT_TO_KITCHEN);
      expect(dests).toContain(OrderStatus.CANCELLED);
      expect(dests).not.toContain(OrderStatus.PAID);
    });

    it('returns empty for terminal states', () => {
      expect(allowedTransitions(OrderStatus.PAID)).toEqual([]);
      expect(allowedTransitions(OrderStatus.CANCELLED)).toEqual([]);
      expect(allowedTransitions(OrderStatus.DRAFT)).toEqual([]);
    });

    it('DELIVERED only allows PAID', () => {
      expect(allowedTransitions(OrderStatus.DELIVERED)).toEqual([OrderStatus.PAID]);
    });
  });

  describe('isTerminal', () => {
    it('PAID is terminal', () => {
      expect(isTerminal(OrderStatus.PAID)).toBe(true);
    });

    it('CANCELLED is terminal', () => {
      expect(isTerminal(OrderStatus.CANCELLED)).toBe(true);
    });

    it('DRAFT is NOT terminal (reserved status, not in use)', () => {
      // DRAFT is reserved but not in TERMINAL_STATUSES array
      expect(isTerminal(OrderStatus.DRAFT)).toBe(false);
    });

    it('PENDING is not terminal', () => {
      expect(isTerminal(OrderStatus.PENDING)).toBe(false);
    });

    it('DELIVERED is not terminal', () => {
      expect(isTerminal(OrderStatus.DELIVERED)).toBe(false);
    });
  });

  describe('isEditable', () => {
    it('only PENDING is editable', () => {
      expect(isEditable(OrderStatus.PENDING)).toBe(true);
      expect(isEditable(OrderStatus.SENT_TO_KITCHEN)).toBe(false);
      expect(isEditable(OrderStatus.IN_PREPARATION)).toBe(false);
      expect(isEditable(OrderStatus.READY)).toBe(false);
      expect(isEditable(OrderStatus.DELIVERED)).toBe(false);
      expect(isEditable(OrderStatus.PAID)).toBe(false);
      expect(isEditable(OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('constants', () => {
    it('TERMINAL_STATUSES contains only PAID and CANCELLED', () => {
      expect(TERMINAL_STATUSES).toContain(OrderStatus.PAID);
      expect(TERMINAL_STATUSES).toContain(OrderStatus.CANCELLED);
      expect(TERMINAL_STATUSES).not.toContain(OrderStatus.DRAFT);
      expect(TERMINAL_STATUSES).toHaveLength(2);
    });

    it('ACTIVE_STATUSES contains operational states', () => {
      expect(ACTIVE_STATUSES).toContain(OrderStatus.PENDING);
      expect(ACTIVE_STATUSES).toContain(OrderStatus.SENT_TO_KITCHEN);
      expect(ACTIVE_STATUSES).toContain(OrderStatus.IN_PREPARATION);
      expect(ACTIVE_STATUSES).toContain(OrderStatus.READY);
      expect(ACTIVE_STATUSES).toContain(OrderStatus.DELIVERED);
      expect(ACTIVE_STATUSES).not.toContain(OrderStatus.PAID);
      expect(ACTIVE_STATUSES).not.toContain(OrderStatus.CANCELLED);
    });

    it('KDS_VISIBLE_STATUSES shows kitchen-relevant states', () => {
      expect(KDS_VISIBLE_STATUSES).toContain(OrderStatus.SENT_TO_KITCHEN);
      expect(KDS_VISIBLE_STATUSES).toContain(OrderStatus.IN_PREPARATION);
      expect(KDS_VISIBLE_STATUSES).not.toContain(OrderStatus.PENDING);
    });
  });
});
