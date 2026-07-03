import { type DynamicModule, type Provider, Module, Logger } from '@nestjs/common';
import type { AuthModuleOptions, AuthModuleAsyncOptions } from './auth.options';
import {
  AUTH_MODULE_OPTIONS,
  AUTH_STRATEGIES,
  CACHE_SERVICE,
  USER_SERVICE,
} from './auth.constants';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { PasswordService } from './password/password.service';
import { JwtService } from './session/jwt.service';
import { TokenBlacklistService } from './session/token-blacklist.service';
import { DeviceSessionService } from './session/device-session.service';
import { ThrottleService } from './throttling/throttle.service';
import { CredentialsStrategy } from './strategies/credentials/credentials.strategy';
import { OAuthStrategy, OAuthProviderRegistry } from './strategies/oauth/index';
import { TotpStrategy } from './strategies/totp/totp.strategy';
import { AnonymousStrategy } from './strategies/anonymous/anonymous.strategy';
import { MagicLinkStrategy } from './strategies/magic-link/magic-link.strategy';
import { OtpStrategy } from './strategies/otp/otp.strategy';
import { PasskeyStrategy } from './strategies/passkey/passkey.strategy';
import { OneTapStrategy } from './strategies/onetap/onetap.strategy';
import { SsoStrategy } from './strategies/sso/sso.strategy';
import { RbacService, RbacGuard } from './authorization/rbac';
import { PbacService, PbacGuard } from './authorization/pbac';
import { ApiKeyGuard } from './api-key.guard';
import type { IAuthStrategy, ICacheService, IUserService } from './interfaces';

const logger = new Logger('AuthModule');

@Module({})
export class AuthModule {
  /**
   * Configure the auth module synchronously.
   */
  static forRoot(options: AuthModuleOptions, extraProviders: Provider[] = []): DynamicModule {
    return AuthModule.buildModule(options, extraProviders);
  }

  /**
   * Configure the auth module asynchronously.
   */
  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const asyncProviders = AuthModule.createAsyncProviders(options);
    const strategyProviders = AuthModule.createStrategyProviders(true);
    const coreProviders = AuthModule.createCoreProviders();
    const authzProviders = AuthModule.createAuthzProviders();
    const enabledStrategiesProvider = AuthModule.createEnabledStrategiesProvider();

    return {
      module: AuthModule,
      global: options.global ?? true,
      imports: options.imports ?? [],
      providers: [
        ...asyncProviders,
        ...strategyProviders,
        ...coreProviders,
        ...authzProviders,
        enabledStrategiesProvider,
        ...(options.extraProviders ?? []),
      ],
      exports: AuthModule.getExports(),
    };
  }

  private static buildModule(
    options: AuthModuleOptions,
    extraProviders: Provider[],
  ): DynamicModule {
    const providers: Provider[] = [
      { provide: AUTH_MODULE_OPTIONS, useValue: options },
      ...AuthModule.createStrategyProviders(false),
      ...AuthModule.createCoreProviders(),
      ...AuthModule.createAuthzProviders(),
      AuthModule.createEnabledStrategiesProvider(),
      ...extraProviders,
    ];

    if (!options.cacheServiceToken) {
      logger.warn(
        'You must register a provider under the "CACHE_SERVICE" injection token. ' +
          'See AuthModuleOptions.cacheServiceToken.',
      );
    }

    if (options.apiKey) {
      logger.warn(
        'API key authentication is enabled. You must register a provider under the "API_KEY_STORE" ' +
          'injection token implementing IApiKeyStore.',
      );
    }

    return {
      module: AuthModule,
      global: options.global ?? true,
      providers,
      exports: AuthModule.getExports(),
    };
  }

  private static createAsyncProviders(options: AuthModuleAsyncOptions): Provider[] {
    return [
      {
        provide: AUTH_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    ];
  }

  /**
   * Conditionally register strategy classes based on config.
   * Only enabled strategies are registered as providers.
   */
  private static createStrategyProviders(async: boolean): Provider[] {
    const providers: Provider[] = [];

    // Credentials — enabled by default (unless explicitly false)
    providers.push({
      provide: CredentialsStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (options.credentials === false) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('credentials'));
        }
        return new CredentialsStrategy(
          args[1] as IUserService,
          args[2] as PasswordService,
          args[3] as JwtService,
        );
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, USER_SERVICE, PasswordService, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, USER_SERVICE, PasswordService, JwtService] as const),
    });

    // OAuth — enabled when config provided
    providers.push({
      provide: OAuthStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.oauth) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('oauth'));
        }
        const registry = new OAuthProviderRegistry();
        const oauthOpts = options.oauth as Record<string, unknown>;
        for (const [provider, cfg] of Object.entries(oauthOpts)) {
          if (typeof cfg === 'object' && cfg !== null) {
            registry.register(provider, cfg as never);
          }
        }
        return new OAuthStrategy(args[1] as IUserService, args[2] as JwtService, registry);
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const),
    });

    // TOTP — enabled when config provided
    providers.push({
      provide: TotpStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.totp) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('totp'));
        }
        return new TotpStrategy(args[1] as IUserService, args[2] as JwtService);
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const),
    });

    // Anonymous — enabled when config provided
    providers.push({
      provide: AnonymousStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.anonymous) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('anonymous'));
        }
        return new AnonymousStrategy(args[1] as JwtService);
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, JwtService] as const),
    });

    // Magic Link — enabled when config provided
    providers.push({
      provide: MagicLinkStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.magicLink) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('magic-link'));
        }
        return new MagicLinkStrategy(
          args[1] as ICacheService,
          args[2] as IUserService,
          args[3] as JwtService,
        );
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, CACHE_SERVICE, USER_SERVICE, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, CACHE_SERVICE, USER_SERVICE, JwtService] as const),
    });

    // OTP — enabled when config provided
    providers.push({
      provide: OtpStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.otp) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('otp'));
        }
        return new OtpStrategy(
          args[1] as ICacheService,
          args[2] as IUserService,
          args[3] as JwtService,
        );
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, CACHE_SERVICE, USER_SERVICE, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, CACHE_SERVICE, USER_SERVICE, JwtService] as const),
    });

    // Passkey — enabled when config provided
    providers.push({
      provide: PasskeyStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.passkey) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('passkey'));
        }
        return new PasskeyStrategy(args[1] as IUserService, args[2] as JwtService);
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const),
    });

    // OneTap — enabled when config provided
    providers.push({
      provide: OneTapStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.onetap) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('onetap'));
        }
        return new OneTapStrategy(args[1] as IUserService, args[2] as JwtService);
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const),
    });

    // SSO — enabled when config provided
    providers.push({
      provide: SsoStrategy,
      useFactory: (...args: unknown[]) => {
        const options = args[0] as AuthModuleOptions;
        if (!options.sso) {
          return AuthModule.createDisabledStrategy(AuthModule.nameFor('sso'));
        }
        return new SsoStrategy(args[1] as IUserService, args[2] as JwtService);
      },
      inject: async
        ? ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const)
        : ([AUTH_MODULE_OPTIONS, USER_SERVICE, JwtService] as const),
    });

    return providers;
  }

  private static createCoreProviders(): Provider[] {
    return [
      AuthService,
      AuthGuard,
      PasswordService,
      JwtService,
      TokenBlacklistService,
      DeviceSessionService,
      ThrottleService,
      ApiKeyGuard,
    ];
  }

  private static createAuthzProviders(): Provider[] {
    return [
      RbacGuard,
      {
        provide: RbacService,
        useFactory: (cache: ICacheService) => {
          return new RbacService(cache);
        },
        inject: [CACHE_SERVICE],
      },
      {
        provide: PbacGuard,
        useFactory: (reflector: unknown, pbacService: PbacService) => {
          return new PbacGuard(reflector as never, pbacService);
        },
        inject: ['Reflector', PbacService],
      },
      {
        provide: PbacService,
        useFactory: (cache: ICacheService) => {
          return new PbacService(cache);
        },
        inject: [CACHE_SERVICE],
      },
    ];
  }

  private static createEnabledStrategiesProvider(): Provider {
    return {
      provide: AUTH_STRATEGIES,
      useFactory: (
        credentials: IAuthStrategy,
        oauth: IAuthStrategy,
        totp: IAuthStrategy,
        anonymous: IAuthStrategy,
        magicLink: IAuthStrategy,
        otp: IAuthStrategy,
        passkey: IAuthStrategy,
        onetap: IAuthStrategy,
        sso: IAuthStrategy,
      ) => {
        const all = [
          credentials,
          oauth,
          totp,
          anonymous,
          magicLink,
          otp,
          passkey,
          onetap,
          sso,
        ] as IAuthStrategy[];
        return all.filter((s) => !(s as unknown as DisabledStrategy)._disabled);
      },
      inject: [
        CredentialsStrategy,
        OAuthStrategy,
        TotpStrategy,
        AnonymousStrategy,
        MagicLinkStrategy,
        OtpStrategy,
        PasskeyStrategy,
        OneTapStrategy,
        SsoStrategy,
      ],
    };
  }

  private static getExports(): Provider[] {
    return [
      AuthService,
      AuthGuard,
      ApiKeyGuard,
      RbacService,
      RbacGuard,
      PbacService,
      PbacGuard,
      PasswordService,
      JwtService,
      TokenBlacklistService,
      DeviceSessionService,
      ThrottleService,
      CredentialsStrategy,
      OAuthStrategy,
      OAuthProviderRegistry,
      TotpStrategy,
      AnonymousStrategy,
      MagicLinkStrategy,
      OtpStrategy,
      PasskeyStrategy,
      OneTapStrategy,
      SsoStrategy,
    ];
  }

  private static createDisabledStrategy(name: string): DisabledStrategy {
    const s = new DisabledStrategy();
    s._name = name;
    return s;
  }

  private static nameFor(method: string): string {
    return method;
  }
}

class DisabledStrategy implements IAuthStrategy {
  _disabled = true;
  _name = 'disabled';
  type = '' as never;
  name = 'disabled';

  authenticate(): never {
    throw new Error(`Strategy "${this._name}" is not enabled`);
  }
}
