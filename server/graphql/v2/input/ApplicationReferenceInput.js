import { GraphQLInputObjectType, GraphQLInt, GraphQLString } from 'graphql';

import models from '../../../models';
import { NotFound } from '../../errors';
import { idDecode, IDENTIFIER_TYPES } from '../identifiers';

export const ApplicationReferenceInput = new GraphQLInputObjectType({
  name: 'ApplicationReferenceInput',
  fields: () => ({
    id: {
      type: GraphQLString,
      description: 'The public id identifying the application (ie: dgm9bnk8-0437xqry-ejpvzeol-jdayw5re)',
    },
    legacyId: {
      type: GraphQLInt,
      description: 'The legacy public id identifying the application (ie: 4242)',
    },
    clientId: {
      type: GraphQLString,
      description: 'The clientId for the application.',
    },
  }),
});

/**
 * Retrieves an application
 *
 * @param {object} input - id of the application
 */
export const fetchApplicationWithReference = async input => {
  let application;
  if (input.id) {
    const id = idDecode(input.id, IDENTIFIER_TYPES.APPLICATION);
    application = await models.Application.findByPk(id);
  } else if (input.legacyId) {
    application = await models.Application.findByPk(input.legacyId);
  } else if (input.clientId) {
    application = await models.Application.findOne('clientId', input.clientId);
  } else {
    throw new Error('Please provide an id');
  }
  if (!application) {
    throw new NotFound('Application Not Found');
  }
  return application;
};
