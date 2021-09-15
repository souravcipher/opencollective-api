import { GraphQLEnumType } from 'graphql';

import ACTIVITY from '../../../constants/activities';

const EmailSubscriptionType = new GraphQLEnumType({
  name: 'EmailSubscriptionType',
  values: {
    UPDATE_PUBLISHED: {
      value: ACTIVITY.COLLECTIVE_UPDATE_PUBLISHED,
      description: 'When a new update gets published',
    },
  },
});

export default EmailSubscriptionType;
