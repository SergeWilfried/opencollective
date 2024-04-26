import { startCase } from 'lodash';
import { defineMessages } from 'react-intl';

import { WebsiteName } from '../../components/I18nFormatters';

import { PAYMENT_METHOD_SERVICE } from '../constants/payment-methods';

const i18nPaymentMethodServiceLabels = defineMessages({
  [PAYMENT_METHOD_SERVICE.PREPAID]: {
    id: 'Prepaid',
    defaultMessage: 'Prepaid Card',
  },

});

export const i18nPaymentMethodService = (service, intl) => {
  const PaymentMethodServiceI18n = {
    [PAYMENT_METHOD_SERVICE.PAYPAL]: 'PayPal',
    [PAYMENT_METHOD_SERVICE.WISE]: 'Wise',
    [PAYMENT_METHOD_SERVICE.BIZAO]: 'Bizao',
    [PAYMENT_METHOD_SERVICE.PAYSTACK]: 'Paystack',
    [PAYMENT_METHOD_SERVICE.BANK]: intl.formatMessage(messages[PAYMENT_METHOD_SERVICE.BANK]),
  };

  switch (service) {
    case PAYMENT_METHOD_SERVICE.PAYPAL:
      return 'PayPal';
    case PAYMENT_METHOD_SERVICE.THEGIVINGBLOCK:
      return 'The Giving Block';
    case PAYMENT_METHOD_SERVICE.OPENCOLLECTIVE:
      return WebsiteName;
    case PAYMENT_METHOD_SERVICE.BIZAO:
      return 'Bizao';
    case PAYMENT_METHOD_SERVICE.PAYSTACK:
      return 'Paystack';
    default:
      return startCase(service.toLowerCase());
  }
};
