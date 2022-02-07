import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLInterfaceType, GraphQLList, GraphQLNonNull } from 'graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { HOST_FEE_STRUCTURE } from '../../../constants/host-fee-structure';
import models from '../../../models';
import { PayoutMethodTypes } from '../../../models/PayoutMethod';
import { getHostSupportedPayoutMethods, hostResolver } from '../../common/collective';
import { PayoutMethodType } from '../enum';
import { HostFeeStructure } from '../enum/HostFeeStructure';
import { Host } from '../object/Host';

export const AccountWithHostFields = {
  host: {
    description: 'Returns the Fiscal Host',
    type: Host,
    resolve: hostResolver,
  },
  hostFeesStructure: {
    description: 'Describe how the host charges the collective',
    type: HostFeeStructure,
    resolve: (account: typeof models.Collective): HOST_FEE_STRUCTURE | null => {
      if (!account.HostCollectiveId) {
        return null;
      } else if (account.data?.useCustomHostFee) {
        return HOST_FEE_STRUCTURE.CUSTOM_FEE;
      } else {
        return HOST_FEE_STRUCTURE.DEFAULT;
      }
    },
  },
  hostFeePercent: {
    description: 'Fees percentage that the host takes for this collective',
    type: GraphQLFloat,
  },
  platformFeePercent: {
    description: 'Fees percentage that the platform takes for this collective',
    type: GraphQLInt,
  },
  approvedAt: {
    description: 'Date of approval by the Fiscal Host.',
    type: GraphQLDateTime,
    resolve(account: typeof models.Collective): Promise<Date> {
      return account.approvedAt;
    },
  },
  isApproved: {
    description: "Returns whether it's approved by the Fiscal Host",
    type: new GraphQLNonNull(GraphQLBoolean),
    resolve(account: typeof models.Collective): boolean {
      return account.isApproved();
    },
  },
  isActive: {
    description: "Returns whether it's active: can accept financial contributions and pay expenses.",
    type: new GraphQLNonNull(GraphQLBoolean),
    resolve(account: typeof models.Collective): boolean {
      return Boolean(account.isActive);
    },
  },
  supportedPayoutMethods: {
    type: new GraphQLList(PayoutMethodType),
    description: 'The list of payout methods this Host accepts for its expenses',
    async resolve(account, _, req) {
      const host = await hostResolver(account, null, req);
      if (host) {
        return getHostSupportedPayoutMethods(host, req);
      } else {
        // For collectives without a host, we allow expenses to be submitted with the "Other"/"Custom" payout method
        // This is mostly for people trying out the platform.
        return [PayoutMethodTypes.OTHER];
      }
    },
  },
};

export const AccountWithHost = new GraphQLInterfaceType({
  name: 'AccountWithHost',
  description: 'An account that can be hosted by a Host',
  fields: () => AccountWithHostFields,
});
