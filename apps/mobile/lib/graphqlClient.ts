import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { captureFrontendException } from './posthog';

function getGraphQLUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const base = process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
    return `${base}/graphql`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.developer?.manifest?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `http://${hostIp}:3000/graphql`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/graphql';
  }
  return 'http://localhost:3000/graphql';
}

const GRAPHQL_URL = getGraphQLUrl();
console.log(`[GraphQL Client] Connecting to ${GRAPHQL_URL}`);

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      captureFrontendException(new Error(`[GraphQL Error]: ${message}`), {
        component: 'ApolloClient',
        action: operation.operationName,
        extra: { locations, path },
      });
    });
  }
  if (networkError) {
    captureFrontendException(new Error(`[Network Error]: ${networkError.message || 'Network request failed'}`), {
      component: 'ApolloClient',
      action: operation.operationName,
      extra: { type: 'NetworkError', targetUrl: GRAPHQL_URL },
    });
  }
});

export const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        menu: {
          merge(_, incoming) {
            return incoming;
          },
        },
        inventory: {
          merge(_, incoming) {
            return incoming;
          },
        },
        orders: {
          merge(_, incoming) {
            return incoming;
          },
        },
      },
    },
  },
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
});

const memoryStorage = new Map<string, string>();

const safeStorageAdapter = {
  getItem: async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};

export async function initApolloCachePersistence() {
  try {
    await persistCache({
      cache,
      storage: new AsyncStorageWrapper(safeStorageAdapter),
      maxSize: false,
    });
    console.log('[GraphQL Client] Cache persistence initialized');
  } catch (err) {
    console.warn('[GraphQL Client] Cache persistence fallback to memory:', err);
  }
}
