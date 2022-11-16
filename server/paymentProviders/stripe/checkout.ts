/* eslint-disable camelcase */
import config from 'config';
import { toUpper } from 'lodash';
import type Stripe from 'stripe';

import OrderStatuses from '../../constants/order_status';
import logger from '../../lib/logger';
import { getApplicationFee } from '../../lib/payments';
import stripe, { convertToStripeAmount } from '../../lib/stripe';

import { APPLICATION_FEE_INCOMPATIBLE_CURRENCIES } from './common';

export const createCheckoutSession = async order => {
  try {
    const hostStripeAccount = await order.collective.getHostStripeAccount();
    const host = await order.collective.getHostCollective();
    const isPlatformRevenueDirectlyCollected = APPLICATION_FEE_INCOMPATIBLE_CURRENCIES.includes(toUpper(host.currency))
      ? false
      : host?.settings?.isPlatformRevenueDirectlyCollected ?? true;
    const applicationFee = await getApplicationFee(order, host);
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      success_url: `${config.host.website}/api/services/stripe/checkout?order=${order.id}`,
      cancel_url: `${config.host.website}/api/services/stripe/checkout?order=${order.id}`,
      line_items: [
        {
          price_data: {
            currency: order.currency,
            product_data: {
              name: order.collective.name,
              description: order.description,
            },
            unit_amount_decimal: convertToStripeAmount(order.currency, order.totalAmount),
          },
          quantity: 1,
        },
      ],
      payment_method_types:
        order.currency === 'USD'
          ? ['us_bank_account']
          : order.currency === 'EUR'
          ? ['giropay', 'ideal', 'sepa_debit']
          : undefined,
      mode: 'payment',
      metadata: {
        from: `${config.host.website}/${order.fromCollective.slug}`,
        to: `${config.host.website}/${order.collective.slug}`,
      },
    };
    if (
      applicationFee &&
      isPlatformRevenueDirectlyCollected &&
      hostStripeAccount.username !== config.stripe.accountId
    ) {
      sessionParams.payment_intent_data = {
        application_fee_amount: convertToStripeAmount(order.currency, applicationFee),
      };
    }
    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: hostStripeAccount.username,
    });
    await order.update({ data: { ...order.data, session } });
  } catch (e) {
    logger.error(e);
  }
};

export const confirmOrder = async order => {
  const hostStripeAccount = await order.collective.getHostStripeAccount();

  const session = await stripe.checkout.sessions.retrieve(order.data.session.id, {
    stripeAccount: hostStripeAccount.username,
  });

  if (session.status === 'complete') {
    await order.update({ data: { ...order.data, session }, status: OrderStatuses.PENDING });
    return order;
  } else {
    await order.destroy();
    return;
  }
};

export default {
  features: {
    recurring: false,
    waitToCharge: false,
  },
  processOrder: createCheckoutSession,
};
