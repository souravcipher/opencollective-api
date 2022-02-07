import { PayoutMethodTypes } from '../../models/PayoutMethod';

/**
 * Resolver function for host field on Collective type.
 */
export function hostResolver(collective, _, { loaders }) {
  let hostCollective = null;
  if (collective.HostCollectiveId) {
    hostCollective = await loaders.Collective.byId.load(collective.HostCollectiveId);
    // Get the host collective from the parent collective.
  } else if (collective.ParentCollectiveId) {
    const parentCollective = await loaders.Collective.byId.load(collective.ParentCollectiveId);
    if (parentCollective && parentCollective.HostCollectiveId) {
      hostCollective = await loaders.Collective.byId.load(parentCollective.HostCollectiveId);
    }
  }
  return hostCollective;
}

export function getHostSupportedPayoutMethods(host, req) {
  if (!host) {
    return [];
  }

  const connectedAccounts = await req.loaders.Collective.connectedAccounts.load(host.id);
  const supportedPayoutMethods = [PayoutMethodTypes.ACCOUNT_BALANCE, PayoutMethodTypes.BANK_ACCOUNT];

  // Check for PayPal
  if (connectedAccounts?.find?.(c => c.service === 'paypal') && !host.settings?.disablePaypalPayouts) {
    supportedPayoutMethods.push(PayoutMethodTypes.PAYPAL); // Payout
  } else {
    try {
      if (await host.getPaymentMethod({ service: 'paypal', type: 'adaptive' })) {
        supportedPayoutMethods.push(PayoutMethodTypes.PAYPAL); // Adaptive
      }
    } catch {
      // ignore missing paypal payment method
    }
  }

  if (!host.settings?.disableCustomPayoutMethod) {
    supportedPayoutMethods.push(PayoutMethodTypes.OTHER);
  }
  if (connectedAccounts?.find?.(c => c.service === 'privacy')) {
    supportedPayoutMethods.push(PayoutMethodTypes.CREDIT_CARD);
  }

  return supportedPayoutMethods;
}
