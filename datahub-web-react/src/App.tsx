import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { BrowserRouter as Router } from 'react-router-dom';
import { ApolloClient, ApolloProvider, createHttpLink, InMemoryCache, ServerError } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider } from 'styled-components';

import './App.less';
import { Routes } from './app/Routes';
import { mocks } from './Mocks';
import EntityRegistry from './app/entity/EntityRegistry';
import { DashboardEntity } from './app/entity/dashboard/DashboardEntity';
import { ChartEntity } from './app/entity/chart/ChartEntity';
import { UserEntity } from './app/entity/user/User';
import { DatasetEntity } from './app/entity/dataset/DatasetEntity';
import { DataFlowEntity } from './app/entity/dataFlow/DataFlowEntity';
import { DataJobEntity } from './app/entity/dataJob/DataJobEntity';
import { TagEntity } from './app/entity/tag/Tag';
import { EntityRegistryContext } from './entityRegistryContext';
import { Theme } from './conf/theme/types';
import defaultThemeConfig from './conf/theme/theme_light.config.json';
import { PageRoutes } from './conf/Global';
import { isLoggedInVar } from './app/auth/checkAuthStatus';
import { GlobalCfg } from './conf';

// Enable to use the Apollo MockProvider instead of a real HTTP client
const MOCK_MODE = false;

/*
    Construct Apollo Client 
*/
const httpLink = createHttpLink({ uri: '/api/v2/graphql' });

const errorLink = onError(({ networkError }) => {
    if (networkError) {
        const serverError = networkError as ServerError;
        if (serverError.statusCode === 401) {
            isLoggedInVar(false);
            Cookies.remove(GlobalCfg.CLIENT_AUTH_COOKIE);
            window.location.replace(PageRoutes.AUTHENTICATE);
        }
    }
});

const client = new ApolloClient({
    link: errorLink.concat(httpLink),
    cache: new InMemoryCache({
        typePolicies: {
            Dataset: {
                keyFields: ['urn'],
            },
            CorpUser: {
                keyFields: ['urn'],
            },
            Dashboard: {
                keyFields: ['urn'],
            },
            Chart: {
                keyFields: ['urn'],
            },
            DataFlow: {
                keyFields: ['urn'],
            },
            DataJob: {
                keyFields: ['urn'],
            },
        },
        possibleTypes: {
            EntityWithRelationships: ['Dataset', 'Chart', 'Dashboard', 'DataJob'],
        },
    }),
    credentials: 'include',
});

const App: React.VFC = () => {
    const [dynamicThemeConfig, setDynamicThemeConfig] = useState<Theme>(defaultThemeConfig);

    useEffect(() => {
        import(`./conf/theme/${process.env.REACT_APP_THEME_CONFIG}`).then((theme) => {
            setDynamicThemeConfig(theme);
        });
    }, []);

    const entityRegistry = useMemo(() => {
        const register = new EntityRegistry();
        register.register(new DatasetEntity());
        register.register(new DashboardEntity());
        register.register(new ChartEntity());
        register.register(new UserEntity());
        register.register(new TagEntity());
        register.register(new DataFlowEntity());
        register.register(new DataJobEntity());
        return register;
    }, []);

    return (
        <ThemeProvider theme={dynamicThemeConfig}>
            <Router>
                <EntityRegistryContext.Provider value={entityRegistry}>
                    {/* Temporary: For local testing during development. */}
                    {MOCK_MODE ? (
                        <MockedProvider
                            mocks={mocks}
                            addTypename={false}
                            defaultOptions={{
                                watchQuery: { fetchPolicy: 'no-cache' },
                                query: { fetchPolicy: 'no-cache' },
                            }}
                        >
                            <Routes />
                        </MockedProvider>
                    ) : (
                        <ApolloProvider client={client}>
                            <Routes />
                        </ApolloProvider>
                    )}
                </EntityRegistryContext.Provider>
            </Router>
        </ThemeProvider>
    );
};

export default App;
