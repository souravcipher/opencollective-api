import { GraphQLBoolean, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import CHANNEL from '../../../constants/channels';
import { types as collectiveTypes } from '../../../constants/collectives';
import models from '../../../models';
import { hasSeenLatestChangelogEntry } from '../../common/user';
import EmailSubscriptionType from '../enum/EmailSubscriptionType';
import { idDecode, IDENTIFIER_TYPES } from '../identifiers';
import { Account, AccountFields } from '../interface/Account';

import EmailSubscription from './EmailSubscription';
import { Host } from './Host';

export const Individual = new GraphQLObjectType({
  name: 'Individual',
  description: 'This represents an Individual account',
  interfaces: () => [Account],
  isTypeOf: collective => collective.type === collectiveTypes.USER,
  fields: () => {
    return {
      ...AccountFields,
      firstName: {
        type: GraphQLString,
        deprecationReason: '2020-10-12: Use the name field',
        resolve(userCollective, args, req) {
          return (
            userCollective && req.loaders.getUserDetailsByCollectiveId.load(userCollective.id).then(u => u.firstName)
          );
        },
      },
      lastName: {
        type: GraphQLString,
        deprecationReason: '2020-10-12: Use the name field',
        resolve(userCollective, args, req) {
          return (
            userCollective && req.loaders.getUserDetailsByCollectiveId.load(userCollective.id).then(u => u.lastName)
          );
        },
      },
      email: {
        type: GraphQLString,
        resolve(userCollective, args, req) {
          if (!req.remoteUser) {
            return null;
          }
          return (
            userCollective && req.loaders.getUserDetailsByCollectiveId.load(userCollective.id).then(user => user.email)
          );
        },
      },
      isGuest: {
        type: new GraphQLNonNull(GraphQLBoolean),
        resolve(account) {
          return Boolean(account.data?.isGuest);
        },
      },
      isFollowingConversation: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        async resolve(userCollective, args) {
          const conversationId = parseInt(idDecode(args.id, IDENTIFIER_TYPES.CONVERSATION));
          const userDetails = await models.User.findOne({
            where: { CollectiveId: userCollective.id },
            attributes: ['id'],
          });

          if (!userDetails) {
            return false;
          } else {
            return models.ConversationFollower.isFollowing(userDetails.id, conversationId);
          }
        },
      },
      location: {
        ...AccountFields.location,
        description: `
          Address. This field is public for hosts, otherwise:
            - Users can see their own address
            - Hosts can see the address of users submitting expenses to their collectives
        `,
        async resolve(individual, _, req) {
          const canSeeLocation = req.remoteUser?.isAdmin(individual.id) || (await individual.isHost());
          if (canSeeLocation) {
            return individual.location;
          }
        },
      },
      hasTwoFactorAuth: {
        type: GraphQLBoolean,
        async resolve(collective) {
          const user = await models.User.findOne({
            where: { CollectiveId: collective.id },
          });
          if (user.twoFactorAuthToken) {
            return true;
          } else {
            return false;
          }
        },
      },
      emailSubscriptions: {
        type: new GraphQLList(new GraphQLNonNull(EmailSubscription)),
        description: 'List of email subscriptions. Will return null if not authenticated as the owner of the account.',
        args: {
          type: {
            type: new GraphQLList(new GraphQLNonNull(EmailSubscriptionType)),
            description: 'The type of email subscription to filter by',
            defaultValue: ['UPDATE_PUBLISHED'],
          },
        },
        async resolve(individual, { type }, req) {
          if (!req.remoteUser?.isAdminOfCollective(individual) || req.remoteUser.CollectiveId !== individual.id) {
            return null;
          }

          const notifications = await models.Notification.findAll({
            where: {
              UserId: req.remoteUser.id,
              channel: CHANNEL.EMAIL,
              type,
            },
          });

          console.log(notifications);

          return notifications.map(notification => ({
            subscriberAccount: individual,
            account: req.loaders.Collective.byId.load(notification.CollectiveId),
            type: notification.type,
            isActive: Boolean(notification.active),
          }));
        },
      },
      host: {
        type: Host,
        description: 'If the individual is a host account, this will return the matching Host object',
        resolve(collective) {
          if (collective.isHostAccount) {
            return collective;
          }
        },
      },
      hasSeenLatestChangelogEntry: {
        type: new GraphQLNonNull(GraphQLBoolean),
        async resolve(collective) {
          const user = collective.getUser();
          return hasSeenLatestChangelogEntry(user);
        },
      },
    };
  },
});

export default Individual;
