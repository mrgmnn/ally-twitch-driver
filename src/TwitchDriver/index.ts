/*
|--------------------------------------------------------------------------
| Ally Oauth driver
|--------------------------------------------------------------------------
|
| This is a dummy implementation of the Oauth driver. Make sure you
|
| - Got through every line of code
| - Read every comment
|
*/

import type { AllyUserContract } from '@ioc:Adonis/Addons/Ally'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Oauth2Driver, ApiRequest, RedirectRequest } from '@adonisjs/ally/build/standalone'

/**
 * Define the access token object properties in this type. It
 * must have "token" and "type" and you are free to add
 * more properties.
 *
 * ------------------------------------------------
 * Change "TwitchDriver" to something more relevant
 * ------------------------------------------------
 */
export type TwitchDriverAccessToken = {
  token: string
  type: 'bearer'
}

/**
 * Define a union of scopes your driver accepts. Here's an example of same
 * https://github.com/adonisjs/ally/blob/develop/adonis-typings/ally.ts#L236-L268
 *
 * ------------------------------------------------
 * Change "TwitchDriver" to something more relevant
 * ------------------------------------------------
 */
export type TwitchDriverScopes =
  | 'analytics:read:extensions'
  | 'analytics:read:games'
  | 'bits:read'
  | 'channel:edit:commercial'
  | 'channel:manage:broadcast'
  | 'channel:manage:extensions'
  | 'channel:manage:polls'
  | 'channel:manage:predictions'
  | 'channel:manage:redemptions'
  | 'channel:manage:schedule'
  | 'channel:manage:videos'
  | 'channel:read:editors'
  | 'channel:read:goals'
  | 'channel:read:hype_train'
  | 'channel:read:polls'
  | 'channel:read:predictions'
  | 'channel:read:redemptions'
  | 'channel:read:stream_key'
  | 'channel:read:subscriptions'
  | 'clips:edit'
  | 'moderation:read'
  | 'moderator:manage:automod'
  | 'user:edit'
  | 'user:edit:follows'
  | 'user:manage:blocked_users'
  | 'user:read:blocked_users'
  | 'user:read:broadcast'
  | 'user:read:email'
  | 'user:read:follows'
  | 'user:read:subscriptions'

export type LiteralStringUnion<LiteralType> = LiteralType | (string & { _?: never })

/**
 * Define the configuration options accepted by your driver. It must have the following
 * properties and you are free add more.
 *
 * ------------------------------------------------
 * Change "TwitchDriver" to something more relevant
 * ------------------------------------------------
 */
export type TwitchDriverConfig = {
  driver: 'TwitchDriver'
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
  scopes?: LiteralStringUnion<TwitchDriverScopes>[]
}

/**
 * Driver implementation. It is mostly configuration driven except the user calls
 *
 * ------------------------------------------------
 * Change "TwitchDriver" to something more relevant
 * ------------------------------------------------
 */
export class TwitchDriver extends Oauth2Driver<TwitchDriverAccessToken, TwitchDriverScopes> {
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl = 'https://id.twitch.tv/oauth2/authorize'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl = 'https://id.twitch.tv/oauth2/token'

  /**
   * The URL to hit to get the user details
   *
   * Do not define query strings in this URL.
   */
  protected userInfoUrl = 'https://api.twitch.tv/helix/users'

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'TwitchDriver_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  constructor(ctx: HttpContextContract, public config: TwitchDriverConfig) {
    super(ctx, config)

    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request.
     *
     * DO NOT REMOVE THE FOLLOWING LINE
     */
    this.loadState()
  }

  /**
   * Optionally configure the authorization redirect request. The actual request
   * is made by the base implementation of "Oauth2" driver and this is a
   * hook to pre-configure the request.
   */
  //  protected configureRedirectRequest(request: RedirectRequest<TwitchDriverScopes>) {}

  protected configureRedirectRequest(request: RedirectRequest<TwitchDriverScopes>) {
    /**
     * Define user defined scopes or the default one's
     */
    request.scopes(this.config.scopes || ['user:read:email'])

    request.param('response_type', 'code')
    request.param('grant_type', 'authorization_code')
  }

  /**
   * Optionally configure the access token request. The actual request is made by
   * the base implementation of "Oauth2" driver and this is a hook to pre-configure
   * the request
   */
  // protected configureAccessTokenRequest(request: ApiRequest) {}

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */
  public accessDenied() {
    return this.ctx.request.input('error') === 'Unauthorized'
  }

  private getAuthenticatedRequest(url: string, token: string) {
    const request = this.httpClient(url)
    request.header('Authorization', `Bearer ${token}`)
    request.header('Client-id', this.config.clientId)
    request.header('Accept', 'application/json')
    request.parseAs('json')
    return request
  }

  public async getUserInfo(token: string, callback?: (request: ApiRequest) => void) {
    const request = this.getAuthenticatedRequest(this.userInfoUrl, token)
    if (typeof callback === 'function') {
      callback(request)
    }

    const body = await request.get()
    const [{ id, login, display_name: displayName, email, profile_image_url: profileImageUrl }] =
      body.data
    return {
      id: id,
      name: login,
      nickName: displayName,
      email: email,
      avatarUrl: profileImageUrl || null,
      emailVerificationState: 'unsupported' as const,
      original: body.data[0],
    }
  }

  /**
   * Get the user details by query the provider API. This method must return
   * the access token and the user details both. Checkout the google
   * implementation for same.
   *
   * https://github.com/adonisjs/ally/blob/develop/src/Drivers/Google/index.ts#L191-L199
   */
  public async user(
    callback?: (request: ApiRequest) => void
  ): Promise<AllyUserContract<TwitchDriverAccessToken>> {
    const accessToken = await this.accessToken()
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if required)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    /**
     * Write your implementation details here
     */
    const user = await this.getUserInfo(accessToken.token, callback)

    return {
      ...user,
      token: accessToken,
    }
  }

  public async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequest) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if required)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    const user = await this.getUserInfo(accessToken)
    return {
      ...user,
      token: {
        token: accessToken,
        type: 'bearer' as const,
      },
    }
  }
}
