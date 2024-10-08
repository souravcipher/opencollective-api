import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';

import { GraphQLContributionFrequency } from '../enum';

import { GraphQLAccountReferenceInput } from './AccountReferenceInput';
import { GraphQLAmountInput } from './AmountInput';

const GraphQLPaymentIntentInput = new GraphQLInputObjectType({
  name: 'PaymentIntentInput',
  description: 'Input to create a Stripe payment intent',
  fields: () => {
    return {
      amount: {
        type: new GraphQLNonNull(GraphQLAmountInput),
      },
      fromAccount: {
        type: GraphQLAccountReferenceInput,
      },
      toAccount: {
        type: new GraphQLNonNull(GraphQLAccountReferenceInput),
      },
      frequency: {
        type: GraphQLContributionFrequency,
      },
    };
  },
});

export default GraphQLPaymentIntentInput;
