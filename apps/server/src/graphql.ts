import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './schema/resolvers.js';
import { captureBackendException } from './utils/posthog.js';

export const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphqlEndpoint: '/graphql',
  landingPage: true,
  maskedErrors: false,
  cors: {
    origin: '*',
    credentials: true,
  },
  plugins: [
    {
      onExecutionResult({ result, args }: any) {
        if (
          result &&
          typeof result === 'object' &&
          'errors' in result &&
          Array.isArray(result.errors)
        ) {
          for (const err of result.errors) {
            captureBackendException(err.originalError || err, {
              path: '/graphql',
              method: 'POST',
              extra: {
                graphql_operation: args?.operationName || 'UnnamedOperation',
                graphql_path: err.path,
              },
            });
          }
        }
      },
    },
  ],
});
