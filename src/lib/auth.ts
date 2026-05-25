export const authConfig = {
  clientId: import.meta.env.PUBLIC_GITHUB_CLIENT_ID ?? '',
  exchangeUrl: import.meta.env.PUBLIC_GITHUB_OAUTH_EXCHANGE_URL ?? '',
  redirectPath: '/auth/callback/',
  scopes: ['read:user', 'public_repo'],
  storageKey: 'rosenicu.auth.session',
  stateKey: 'rosenicu.auth.state'
};

export const authorizedEditors = ['r05En1cU', 'RosenIcu'];
