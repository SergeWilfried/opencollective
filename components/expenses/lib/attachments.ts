import { ExpenseType } from '../../../lib/graphql/types/v2/graphql';

import { DROPZONE_ACCEPT_ALL } from '../../StyledDropzone';

export const attachmentDropzoneParams = {
  accept: DROPZONE_ACCEPT_ALL,
  minSize: 1024, // in bytes, =1ko
  maxSize: 10000 * 1024, // in bytes, =10mo
  limit: 15, // Max 15 files per upload
};

export const expenseTypeSupportsAttachments = (type: ExpenseType) => {
  return type === ExpenseType.INVOICE || type === ExpenseType.GRANT || type === ExpenseType.SETTLEMENT;
};
