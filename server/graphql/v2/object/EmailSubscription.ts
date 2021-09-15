import { GraphQLBoolean, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import EmailSubscriptionType from '../enum/EmailSubscriptionType';
import { idEncode, IDENTIFIER_TYPES } from '../identifiers';
import { Account } from '../interface/Account';

import { Individual } from './Individual';

const EmailSubscription = new GraphQLObjectType({
  name: 'EmailSubscription',
  description: 'An email subscription',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The id of the email subscription',
      resolve: ({ subscriberAccount, account, type }) => {
        const uniqueString = `${subscriberAccount.id}-${account.id}-${type}`;
        return idEncode(uniqueString, IDENTIFIER_TYPES.EMAIL_SUBSCRIPTION);
      },
    },
    subscriberAccount: {
      type: new GraphQLNonNull(Individual),
      description: 'The account that subscribed to this notification',
    },
    account: {
      type: new GraphQLNonNull(Account),
      description: 'The account we are subscribing to',
    },
    type: {
      type: new GraphQLNonNull(EmailSubscriptionType),
      description: 'The type of the email subscription',
    },
    isActive: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'Whether the email subscription is active',
    },
  }),
});

export default EmailSubscription;
