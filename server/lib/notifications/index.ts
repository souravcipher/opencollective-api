import config from 'config';
import fetch, { RequestRedirect } from 'node-fetch';

import { activities, channels } from '../../constants';
import ActivityTypes from '../../constants/activities';
import models from '../../models';
import { Activity } from '../../models/Activity';
import { reportErrorToSentry } from '../sentry';
import slackLib from '../slack';
import twitter from '../twitter';
import { parseToBoolean } from '../utils';
import { enrichActivity, sanitizeActivity } from '../webhooks';

import { notifyByEmail } from './email';

const shouldSkipActivity = (activity: Activity) => {
  if (activity.type === ActivityTypes.COLLECTIVE_TRANSACTION_CREATED) {
    if (parseToBoolean(config.activities?.skipTransactions)) {
      return true;
    } else if (!['CONTRIBUTION', 'ADDED_FUNDS'].includes(activity.data?.transaction?.kind)) {
      return true;
    }
  }

  return false;
};

const publishToWebhook = (activity: Activity, webhookUrl: string) => {
  if (slackLib.isSlackWebhookUrl(webhookUrl)) {
    return slackLib.postActivityOnPublicChannel(activity, webhookUrl);
  } else {
    const sanitizedActivity = sanitizeActivity(activity);
    const enrichedActivity = enrichActivity(sanitizedActivity);
    const webhookOptions = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(enrichedActivity),
      redirect: 'manual' as RequestRedirect,
    };
    return fetch(webhookUrl, webhookOptions).then(response => response.json());
  }
};

const dispatch = async (activity: Activity) => {
  notifyByEmail(activity).catch(console.log);

  // process notification entries for slack, twitter, etc...
  if (!activity.CollectiveId || !activity.type) {
    return;
  }

  if (shouldSkipActivity(activity)) {
    return;
  }

  // Some activities involve multiple collectives (eg. collective applying to a host)
  const collectiveIdsToNotify = [activity.CollectiveId];
  if (activity.type === activities.COLLECTIVE_APPLY) {
    collectiveIdsToNotify.push(activity.data.host.id);
  }

  const where = {
    CollectiveId: collectiveIdsToNotify,
    type: [ActivityTypes.ACTIVITY_ALL, activity.type],
    active: true,
  };

  const notificationChannels = await models.Notification.findAll({ where });
  return Promise.all(
    notificationChannels.map(notifConfig => {
      if (notifConfig.channel === channels.SLACK) {
        return slackLib.postActivityOnPublicChannel(activity, notifConfig.webhookUrl);
      } else if (notifConfig.channel === channels.TWITTER) {
        return twitter.tweetActivity(activity);
      } else if (notifConfig.channel === channels.WEBHOOK) {
        return publishToWebhook(activity, notifConfig.webhookUrl);
      }
    }),
  ).catch(err => {
    reportErrorToSentry(err);
    console.error(
      `Error while publishing activity type ${activity.type} for collective ${activity.CollectiveId}`,
      activity,
      'error: ',
      err,
    );
  });
};

export default dispatch;
