/* eslint-disable camelcase */

import { pick, startsWith } from 'lodash';
import type Stripe from 'stripe';

import OrderStatuses from '../../constants/order_status';
import models from '../../models';

import { createChargeTransactions } from './common';

export const handlePaymentIntent = async (event: Stripe.Response<Stripe.Event>) => {
  if (!startsWith(event.type, 'payment_intent')) {
    return;
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const charge = paymentIntent.charges.data[0];
  const order = await models.Order.findOne({
    where: {
      // TODO: DO NOT USE PENDING
      status: OrderStatuses.PENDING,
      data: { session: { payment_intent: paymentIntent.id } },
    },
    include: [{ association: 'collective', required: true }],
  });

  if (!order) {
    return;
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      await createChargeTransactions(charge, { order });
      await order.update({
        status: order.SubscriptionId ? OrderStatuses.ACTIVE : OrderStatuses.PAID,
        processedAt: new Date(),
      });
      break;
    }
    case 'payment_intent.payment_failed': {
      await order.update({
        status: OrderStatuses.ERROR,
        data: { ...order.data, paymentIntent: pick(paymentIntent, ['id', 'status']) },
      });
      break;
    }
  }
};
