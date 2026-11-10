import { defineStateMachine } from './define-state-machine.js'
import type {
  AccountStatus,
} from '../enums/account-status.enums.js';

export const accountApprovalMachine =
  defineStateMachine<AccountStatus>({
    PENDING: ['ACTIVE', 'REJECTED'],
    ACTIVE: ['DISABLED'],
    REJECTED: [],
    DISABLED: ['ACTIVE'],
  });
