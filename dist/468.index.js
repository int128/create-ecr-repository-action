export const id = 468;
export const ids = [468];
export const modules = {

/***/ 2088:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getEndpointFromConfig = void 0;
const node_config_provider_1 = __webpack_require__(6068);
const getEndpointUrlConfig_1 = __webpack_require__(1739);
const getEndpointFromConfig = async (serviceId) => (0, node_config_provider_1.loadConfig)((0, getEndpointUrlConfig_1.getEndpointUrlConfig)(serviceId ?? ""))();
exports.getEndpointFromConfig = getEndpointFromConfig;


/***/ }),

/***/ 1739:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getEndpointUrlConfig = void 0;
const shared_ini_file_loader_1 = __webpack_require__(1247);
const ENV_ENDPOINT_URL = "AWS_ENDPOINT_URL";
const CONFIG_ENDPOINT_URL = "endpoint_url";
const getEndpointUrlConfig = (serviceId) => ({
    environmentVariableSelector: (env) => {
        const serviceSuffixParts = serviceId.split(" ").map((w) => w.toUpperCase());
        const serviceEndpointUrl = env[[ENV_ENDPOINT_URL, ...serviceSuffixParts].join("_")];
        if (serviceEndpointUrl)
            return serviceEndpointUrl;
        const endpointUrl = env[ENV_ENDPOINT_URL];
        if (endpointUrl)
            return endpointUrl;
        return undefined;
    },
    configFileSelector: (profile, config) => {
        if (config && profile.services) {
            const servicesSection = config[["services", profile.services].join(shared_ini_file_loader_1.CONFIG_PREFIX_SEPARATOR)];
            if (servicesSection) {
                const servicePrefixParts = serviceId.split(" ").map((w) => w.toLowerCase());
                const endpointUrl = servicesSection[[servicePrefixParts.join("_"), CONFIG_ENDPOINT_URL].join(shared_ini_file_loader_1.CONFIG_PREFIX_SEPARATOR)];
                if (endpointUrl)
                    return endpointUrl;
            }
        }
        const endpointUrl = profile[CONFIG_ENDPOINT_URL];
        if (endpointUrl)
            return endpointUrl;
        return undefined;
    },
    default: undefined,
});
exports.getEndpointUrlConfig = getEndpointUrlConfig;


/***/ }),

/***/ 1948:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var getEndpointFromConfig = __webpack_require__(2088);
var urlParser = __webpack_require__(8149);
var core = __webpack_require__(6189);
var utilMiddleware = __webpack_require__(5417);
var middlewareSerde = __webpack_require__(8344);

const resolveParamsForS3 = async (endpointParams) => {
    const bucket = endpointParams?.Bucket || "";
    if (typeof endpointParams.Bucket === "string") {
        endpointParams.Bucket = bucket.replace(/#/g, encodeURIComponent("#")).replace(/\?/g, encodeURIComponent("?"));
    }
    if (isArnBucketName(bucket)) {
        if (endpointParams.ForcePathStyle === true) {
            throw new Error("Path-style addressing cannot be used with ARN buckets");
        }
    }
    else if (!isDnsCompatibleBucketName(bucket) ||
        (bucket.indexOf(".") !== -1 && !String(endpointParams.Endpoint).startsWith("http:")) ||
        bucket.toLowerCase() !== bucket ||
        bucket.length < 3) {
        endpointParams.ForcePathStyle = true;
    }
    if (endpointParams.DisableMultiRegionAccessPoints) {
        endpointParams.disableMultiRegionAccessPoints = true;
        endpointParams.DisableMRAP = true;
    }
    return endpointParams;
};
const DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
const IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
const DOTS_PATTERN = /\.\./;
const isDnsCompatibleBucketName = (bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName);
const isArnBucketName = (bucketName) => {
    const [arn, partition, service, , , bucket] = bucketName.split(":");
    const isArn = arn === "arn" && bucketName.split(":").length >= 6;
    const isValidArn = Boolean(isArn && partition && service && bucket);
    if (isArn && !isValidArn) {
        throw new Error(`Invalid ARN: ${bucketName} was an invalid ARN.`);
    }
    return isValidArn;
};

const createConfigValueProvider = (configKey, canonicalEndpointParamKey, config, isClientContextParam = false) => {
    const configProvider = async () => {
        let configValue;
        if (isClientContextParam) {
            const clientContextParams = config.clientContextParams;
            const nestedValue = clientContextParams?.[configKey];
            configValue = nestedValue ?? config[configKey] ?? config[canonicalEndpointParamKey];
        }
        else {
            configValue = config[configKey] ?? config[canonicalEndpointParamKey];
        }
        if (typeof configValue === "function") {
            return configValue();
        }
        return configValue;
    };
    if (configKey === "credentialScope" || canonicalEndpointParamKey === "CredentialScope") {
        return async () => {
            const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
            const configValue = credentials?.credentialScope ?? credentials?.CredentialScope;
            return configValue;
        };
    }
    if (configKey === "accountId" || canonicalEndpointParamKey === "AccountId") {
        return async () => {
            const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
            const configValue = credentials?.accountId ?? credentials?.AccountId;
            return configValue;
        };
    }
    if (configKey === "endpoint" || canonicalEndpointParamKey === "endpoint") {
        return async () => {
            if (config.isCustomEndpoint === false) {
                return undefined;
            }
            const endpoint = await configProvider();
            if (endpoint && typeof endpoint === "object") {
                if ("url" in endpoint) {
                    return endpoint.url.href;
                }
                if ("hostname" in endpoint) {
                    const { protocol, hostname, port, path } = endpoint;
                    return `${protocol}//${hostname}${port ? ":" + port : ""}${path}`;
                }
            }
            return endpoint;
        };
    }
    return configProvider;
};

const toEndpointV1 = (endpoint) => {
    if (typeof endpoint === "object") {
        if ("url" in endpoint) {
            return urlParser.parseUrl(endpoint.url);
        }
        return endpoint;
    }
    return urlParser.parseUrl(endpoint);
};

const getEndpointFromInstructions = async (commandInput, instructionsSupplier, clientConfig, context) => {
    if (!clientConfig.isCustomEndpoint) {
        let endpointFromConfig;
        if (clientConfig.serviceConfiguredEndpoint) {
            endpointFromConfig = await clientConfig.serviceConfiguredEndpoint();
        }
        else {
            endpointFromConfig = await getEndpointFromConfig.getEndpointFromConfig(clientConfig.serviceId);
        }
        if (endpointFromConfig) {
            clientConfig.endpoint = () => Promise.resolve(toEndpointV1(endpointFromConfig));
            clientConfig.isCustomEndpoint = true;
        }
    }
    const endpointParams = await resolveParams(commandInput, instructionsSupplier, clientConfig);
    if (typeof clientConfig.endpointProvider !== "function") {
        throw new Error("config.endpointProvider is not set.");
    }
    const endpoint = clientConfig.endpointProvider(endpointParams, context);
    return endpoint;
};
const resolveParams = async (commandInput, instructionsSupplier, clientConfig) => {
    const endpointParams = {};
    const instructions = instructionsSupplier?.getEndpointParameterInstructions?.() || {};
    for (const [name, instruction] of Object.entries(instructions)) {
        switch (instruction.type) {
            case "staticContextParams":
                endpointParams[name] = instruction.value;
                break;
            case "contextParams":
                endpointParams[name] = commandInput[instruction.name];
                break;
            case "clientContextParams":
            case "builtInParams":
                endpointParams[name] = await createConfigValueProvider(instruction.name, name, clientConfig, instruction.type !== "builtInParams")();
                break;
            case "operationContextParams":
                endpointParams[name] = instruction.get(commandInput);
                break;
            default:
                throw new Error("Unrecognized endpoint parameter instruction: " + JSON.stringify(instruction));
        }
    }
    if (Object.keys(instructions).length === 0) {
        Object.assign(endpointParams, clientConfig);
    }
    if (String(clientConfig.serviceId).toLowerCase() === "s3") {
        await resolveParamsForS3(endpointParams);
    }
    return endpointParams;
};

const endpointMiddleware = ({ config, instructions, }) => {
    return (next, context) => async (args) => {
        if (config.isCustomEndpoint) {
            core.setFeature(context, "ENDPOINT_OVERRIDE", "N");
        }
        const endpoint = await getEndpointFromInstructions(args.input, {
            getEndpointParameterInstructions() {
                return instructions;
            },
        }, { ...config }, context);
        context.endpointV2 = endpoint;
        context.authSchemes = endpoint.properties?.authSchemes;
        const authScheme = context.authSchemes?.[0];
        if (authScheme) {
            context["signing_region"] = authScheme.signingRegion;
            context["signing_service"] = authScheme.signingName;
            const smithyContext = utilMiddleware.getSmithyContext(context);
            const httpAuthOption = smithyContext?.selectedHttpAuthScheme?.httpAuthOption;
            if (httpAuthOption) {
                httpAuthOption.signingProperties = Object.assign(httpAuthOption.signingProperties || {}, {
                    signing_region: authScheme.signingRegion,
                    signingRegion: authScheme.signingRegion,
                    signing_service: authScheme.signingName,
                    signingName: authScheme.signingName,
                    signingRegionSet: authScheme.signingRegionSet,
                }, authScheme.properties);
            }
        }
        return next({
            ...args,
        });
    };
};

const endpointMiddlewareOptions = {
    step: "serialize",
    tags: ["ENDPOINT_PARAMETERS", "ENDPOINT_V2", "ENDPOINT"],
    name: "endpointV2Middleware",
    override: true,
    relation: "before",
    toMiddleware: middlewareSerde.serializerMiddlewareOption.name,
};
const getEndpointPlugin = (config, instructions) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(endpointMiddleware({
            config,
            instructions,
        }), endpointMiddlewareOptions);
    },
});

const resolveEndpointConfig = (input) => {
    const tls = input.tls ?? true;
    const { endpoint, useDualstackEndpoint, useFipsEndpoint } = input;
    const customEndpointProvider = endpoint != null ? async () => toEndpointV1(await utilMiddleware.normalizeProvider(endpoint)()) : undefined;
    const isCustomEndpoint = !!endpoint;
    const resolvedConfig = Object.assign(input, {
        endpoint: customEndpointProvider,
        tls,
        isCustomEndpoint,
        useDualstackEndpoint: utilMiddleware.normalizeProvider(useDualstackEndpoint ?? false),
        useFipsEndpoint: utilMiddleware.normalizeProvider(useFipsEndpoint ?? false),
    });
    let configuredEndpointPromise = undefined;
    resolvedConfig.serviceConfiguredEndpoint = async () => {
        if (input.serviceId && !configuredEndpointPromise) {
            configuredEndpointPromise = getEndpointFromConfig.getEndpointFromConfig(input.serviceId);
        }
        return configuredEndpointPromise;
    };
    return resolvedConfig;
};

const resolveEndpointRequiredConfig = (input) => {
    const { endpoint } = input;
    if (endpoint === undefined) {
        input.endpoint = async () => {
            throw new Error("@smithy/middleware-endpoint: (default endpointRuleSet) endpoint is not set - you must configure an endpoint.");
        };
    }
    return input;
};

exports.endpointMiddleware = endpointMiddleware;
exports.endpointMiddlewareOptions = endpointMiddlewareOptions;
exports.getEndpointFromInstructions = getEndpointFromInstructions;
exports.getEndpointPlugin = getEndpointPlugin;
exports.resolveEndpointConfig = resolveEndpointConfig;
exports.resolveEndpointRequiredConfig = resolveEndpointRequiredConfig;
exports.resolveParams = resolveParams;
exports.toEndpointV1 = toEndpointV1;


/***/ }),

/***/ 5493:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var utilRetry = __webpack_require__(9093);
var protocolHttp = __webpack_require__(9953);
var serviceErrorClassification = __webpack_require__(5433);
var uuid = __webpack_require__(7919);
var utilMiddleware = __webpack_require__(5417);
var smithyClient = __webpack_require__(8125);
var isStreamingPayload = __webpack_require__(8348);

const getDefaultRetryQuota = (initialRetryTokens, options) => {
    const MAX_CAPACITY = initialRetryTokens;
    const noRetryIncrement = utilRetry.NO_RETRY_INCREMENT;
    const retryCost = utilRetry.RETRY_COST;
    const timeoutRetryCost = utilRetry.TIMEOUT_RETRY_COST;
    let availableCapacity = initialRetryTokens;
    const getCapacityAmount = (error) => (error.name === "TimeoutError" ? timeoutRetryCost : retryCost);
    const hasRetryTokens = (error) => getCapacityAmount(error) <= availableCapacity;
    const retrieveRetryTokens = (error) => {
        if (!hasRetryTokens(error)) {
            throw new Error("No retry token available");
        }
        const capacityAmount = getCapacityAmount(error);
        availableCapacity -= capacityAmount;
        return capacityAmount;
    };
    const releaseRetryTokens = (capacityReleaseAmount) => {
        availableCapacity += capacityReleaseAmount ?? noRetryIncrement;
        availableCapacity = Math.min(availableCapacity, MAX_CAPACITY);
    };
    return Object.freeze({
        hasRetryTokens,
        retrieveRetryTokens,
        releaseRetryTokens,
    });
};

const defaultDelayDecider = (delayBase, attempts) => Math.floor(Math.min(utilRetry.MAXIMUM_RETRY_DELAY, Math.random() * 2 ** attempts * delayBase));

const defaultRetryDecider = (error) => {
    if (!error) {
        return false;
    }
    return serviceErrorClassification.isRetryableByTrait(error) || serviceErrorClassification.isClockSkewError(error) || serviceErrorClassification.isThrottlingError(error) || serviceErrorClassification.isTransientError(error);
};

const asSdkError = (error) => {
    if (error instanceof Error)
        return error;
    if (error instanceof Object)
        return Object.assign(new Error(), error);
    if (typeof error === "string")
        return new Error(error);
    return new Error(`AWS SDK error wrapper for ${error}`);
};

class StandardRetryStrategy {
    maxAttemptsProvider;
    retryDecider;
    delayDecider;
    retryQuota;
    mode = utilRetry.RETRY_MODES.STANDARD;
    constructor(maxAttemptsProvider, options) {
        this.maxAttemptsProvider = maxAttemptsProvider;
        this.retryDecider = options?.retryDecider ?? defaultRetryDecider;
        this.delayDecider = options?.delayDecider ?? defaultDelayDecider;
        this.retryQuota = options?.retryQuota ?? getDefaultRetryQuota(utilRetry.INITIAL_RETRY_TOKENS);
    }
    shouldRetry(error, attempts, maxAttempts) {
        return attempts < maxAttempts && this.retryDecider(error) && this.retryQuota.hasRetryTokens(error);
    }
    async getMaxAttempts() {
        let maxAttempts;
        try {
            maxAttempts = await this.maxAttemptsProvider();
        }
        catch (error) {
            maxAttempts = utilRetry.DEFAULT_MAX_ATTEMPTS;
        }
        return maxAttempts;
    }
    async retry(next, args, options) {
        let retryTokenAmount;
        let attempts = 0;
        let totalDelay = 0;
        const maxAttempts = await this.getMaxAttempts();
        const { request } = args;
        if (protocolHttp.HttpRequest.isInstance(request)) {
            request.headers[utilRetry.INVOCATION_ID_HEADER] = uuid.v4();
        }
        while (true) {
            try {
                if (protocolHttp.HttpRequest.isInstance(request)) {
                    request.headers[utilRetry.REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
                }
                if (options?.beforeRequest) {
                    await options.beforeRequest();
                }
                const { response, output } = await next(args);
                if (options?.afterRequest) {
                    options.afterRequest(response);
                }
                this.retryQuota.releaseRetryTokens(retryTokenAmount);
                output.$metadata.attempts = attempts + 1;
                output.$metadata.totalRetryDelay = totalDelay;
                return { response, output };
            }
            catch (e) {
                const err = asSdkError(e);
                attempts++;
                if (this.shouldRetry(err, attempts, maxAttempts)) {
                    retryTokenAmount = this.retryQuota.retrieveRetryTokens(err);
                    const delayFromDecider = this.delayDecider(serviceErrorClassification.isThrottlingError(err) ? utilRetry.THROTTLING_RETRY_DELAY_BASE : utilRetry.DEFAULT_RETRY_DELAY_BASE, attempts);
                    const delayFromResponse = getDelayFromRetryAfterHeader(err.$response);
                    const delay = Math.max(delayFromResponse || 0, delayFromDecider);
                    totalDelay += delay;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
                if (!err.$metadata) {
                    err.$metadata = {};
                }
                err.$metadata.attempts = attempts;
                err.$metadata.totalRetryDelay = totalDelay;
                throw err;
            }
        }
    }
}
const getDelayFromRetryAfterHeader = (response) => {
    if (!protocolHttp.HttpResponse.isInstance(response))
        return;
    const retryAfterHeaderName = Object.keys(response.headers).find((key) => key.toLowerCase() === "retry-after");
    if (!retryAfterHeaderName)
        return;
    const retryAfter = response.headers[retryAfterHeaderName];
    const retryAfterSeconds = Number(retryAfter);
    if (!Number.isNaN(retryAfterSeconds))
        return retryAfterSeconds * 1000;
    const retryAfterDate = new Date(retryAfter);
    return retryAfterDate.getTime() - Date.now();
};

class AdaptiveRetryStrategy extends StandardRetryStrategy {
    rateLimiter;
    constructor(maxAttemptsProvider, options) {
        const { rateLimiter, ...superOptions } = options ?? {};
        super(maxAttemptsProvider, superOptions);
        this.rateLimiter = rateLimiter ?? new utilRetry.DefaultRateLimiter();
        this.mode = utilRetry.RETRY_MODES.ADAPTIVE;
    }
    async retry(next, args) {
        return super.retry(next, args, {
            beforeRequest: async () => {
                return this.rateLimiter.getSendToken();
            },
            afterRequest: (response) => {
                this.rateLimiter.updateClientSendingRate(response);
            },
        });
    }
}

const ENV_MAX_ATTEMPTS = "AWS_MAX_ATTEMPTS";
const CONFIG_MAX_ATTEMPTS = "max_attempts";
const NODE_MAX_ATTEMPT_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => {
        const value = env[ENV_MAX_ATTEMPTS];
        if (!value)
            return undefined;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
            throw new Error(`Environment variable ${ENV_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
    },
    configFileSelector: (profile) => {
        const value = profile[CONFIG_MAX_ATTEMPTS];
        if (!value)
            return undefined;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
            throw new Error(`Shared config file entry ${CONFIG_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
    },
    default: utilRetry.DEFAULT_MAX_ATTEMPTS,
};
const resolveRetryConfig = (input) => {
    const { retryStrategy, retryMode: _retryMode, maxAttempts: _maxAttempts } = input;
    const maxAttempts = utilMiddleware.normalizeProvider(_maxAttempts ?? utilRetry.DEFAULT_MAX_ATTEMPTS);
    return Object.assign(input, {
        maxAttempts,
        retryStrategy: async () => {
            if (retryStrategy) {
                return retryStrategy;
            }
            const retryMode = await utilMiddleware.normalizeProvider(_retryMode)();
            if (retryMode === utilRetry.RETRY_MODES.ADAPTIVE) {
                return new utilRetry.AdaptiveRetryStrategy(maxAttempts);
            }
            return new utilRetry.StandardRetryStrategy(maxAttempts);
        },
    });
};
const ENV_RETRY_MODE = "AWS_RETRY_MODE";
const CONFIG_RETRY_MODE = "retry_mode";
const NODE_RETRY_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[ENV_RETRY_MODE],
    configFileSelector: (profile) => profile[CONFIG_RETRY_MODE],
    default: utilRetry.DEFAULT_RETRY_MODE,
};

const omitRetryHeadersMiddleware = () => (next) => async (args) => {
    const { request } = args;
    if (protocolHttp.HttpRequest.isInstance(request)) {
        delete request.headers[utilRetry.INVOCATION_ID_HEADER];
        delete request.headers[utilRetry.REQUEST_HEADER];
    }
    return next(args);
};
const omitRetryHeadersMiddlewareOptions = {
    name: "omitRetryHeadersMiddleware",
    tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
    relation: "before",
    toMiddleware: "awsAuthMiddleware",
    override: true,
};
const getOmitRetryHeadersPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(omitRetryHeadersMiddleware(), omitRetryHeadersMiddlewareOptions);
    },
});

const retryMiddleware = (options) => (next, context) => async (args) => {
    let retryStrategy = await options.retryStrategy();
    const maxAttempts = await options.maxAttempts();
    if (isRetryStrategyV2(retryStrategy)) {
        retryStrategy = retryStrategy;
        let retryToken = await retryStrategy.acquireInitialRetryToken(context["partition_id"]);
        let lastError = new Error();
        let attempts = 0;
        let totalRetryDelay = 0;
        const { request } = args;
        const isRequest = protocolHttp.HttpRequest.isInstance(request);
        if (isRequest) {
            request.headers[utilRetry.INVOCATION_ID_HEADER] = uuid.v4();
        }
        while (true) {
            try {
                if (isRequest) {
                    request.headers[utilRetry.REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
                }
                const { response, output } = await next(args);
                retryStrategy.recordSuccess(retryToken);
                output.$metadata.attempts = attempts + 1;
                output.$metadata.totalRetryDelay = totalRetryDelay;
                return { response, output };
            }
            catch (e) {
                const retryErrorInfo = getRetryErrorInfo(e);
                lastError = asSdkError(e);
                if (isRequest && isStreamingPayload.isStreamingPayload(request)) {
                    (context.logger instanceof smithyClient.NoOpLogger ? console : context.logger)?.warn("An error was encountered in a non-retryable streaming request.");
                    throw lastError;
                }
                try {
                    retryToken = await retryStrategy.refreshRetryTokenForRetry(retryToken, retryErrorInfo);
                }
                catch (refreshError) {
                    if (!lastError.$metadata) {
                        lastError.$metadata = {};
                    }
                    lastError.$metadata.attempts = attempts + 1;
                    lastError.$metadata.totalRetryDelay = totalRetryDelay;
                    throw lastError;
                }
                attempts = retryToken.getRetryCount();
                const delay = retryToken.getRetryDelay();
                totalRetryDelay += delay;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    else {
        retryStrategy = retryStrategy;
        if (retryStrategy?.mode)
            context.userAgent = [...(context.userAgent || []), ["cfg/retry-mode", retryStrategy.mode]];
        return retryStrategy.retry(next, args);
    }
};
const isRetryStrategyV2 = (retryStrategy) => typeof retryStrategy.acquireInitialRetryToken !== "undefined" &&
    typeof retryStrategy.refreshRetryTokenForRetry !== "undefined" &&
    typeof retryStrategy.recordSuccess !== "undefined";
const getRetryErrorInfo = (error) => {
    const errorInfo = {
        error,
        errorType: getRetryErrorType(error),
    };
    const retryAfterHint = getRetryAfterHint(error.$response);
    if (retryAfterHint) {
        errorInfo.retryAfterHint = retryAfterHint;
    }
    return errorInfo;
};
const getRetryErrorType = (error) => {
    if (serviceErrorClassification.isThrottlingError(error))
        return "THROTTLING";
    if (serviceErrorClassification.isTransientError(error))
        return "TRANSIENT";
    if (serviceErrorClassification.isServerError(error))
        return "SERVER_ERROR";
    return "CLIENT_ERROR";
};
const retryMiddlewareOptions = {
    name: "retryMiddleware",
    tags: ["RETRY"],
    step: "finalizeRequest",
    priority: "high",
    override: true,
};
const getRetryPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(retryMiddleware(options), retryMiddlewareOptions);
    },
});
const getRetryAfterHint = (response) => {
    if (!protocolHttp.HttpResponse.isInstance(response))
        return;
    const retryAfterHeaderName = Object.keys(response.headers).find((key) => key.toLowerCase() === "retry-after");
    if (!retryAfterHeaderName)
        return;
    const retryAfter = response.headers[retryAfterHeaderName];
    const retryAfterSeconds = Number(retryAfter);
    if (!Number.isNaN(retryAfterSeconds))
        return new Date(retryAfterSeconds * 1000);
    const retryAfterDate = new Date(retryAfter);
    return retryAfterDate;
};

exports.AdaptiveRetryStrategy = AdaptiveRetryStrategy;
exports.CONFIG_MAX_ATTEMPTS = CONFIG_MAX_ATTEMPTS;
exports.CONFIG_RETRY_MODE = CONFIG_RETRY_MODE;
exports.ENV_MAX_ATTEMPTS = ENV_MAX_ATTEMPTS;
exports.ENV_RETRY_MODE = ENV_RETRY_MODE;
exports.NODE_MAX_ATTEMPT_CONFIG_OPTIONS = NODE_MAX_ATTEMPT_CONFIG_OPTIONS;
exports.NODE_RETRY_MODE_CONFIG_OPTIONS = NODE_RETRY_MODE_CONFIG_OPTIONS;
exports.StandardRetryStrategy = StandardRetryStrategy;
exports.defaultDelayDecider = defaultDelayDecider;
exports.defaultRetryDecider = defaultRetryDecider;
exports.getOmitRetryHeadersPlugin = getOmitRetryHeadersPlugin;
exports.getRetryAfterHint = getRetryAfterHint;
exports.getRetryPlugin = getRetryPlugin;
exports.omitRetryHeadersMiddleware = omitRetryHeadersMiddleware;
exports.omitRetryHeadersMiddlewareOptions = omitRetryHeadersMiddlewareOptions;
exports.resolveRetryConfig = resolveRetryConfig;
exports.retryMiddleware = retryMiddleware;
exports.retryMiddlewareOptions = retryMiddlewareOptions;


/***/ }),

/***/ 8348:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isStreamingPayload = void 0;
const stream_1 = __webpack_require__(2203);
const isStreamingPayload = (request) => request?.body instanceof stream_1.Readable ||
    (typeof ReadableStream !== "undefined" && request?.body instanceof ReadableStream);
exports.isStreamingPayload = isStreamingPayload;


/***/ }),

/***/ 7601:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var configResolver = __webpack_require__(705);
var nodeConfigProvider = __webpack_require__(6068);
var propertyProvider = __webpack_require__(5169);

const AWS_EXECUTION_ENV = "AWS_EXECUTION_ENV";
const AWS_REGION_ENV = "AWS_REGION";
const AWS_DEFAULT_REGION_ENV = "AWS_DEFAULT_REGION";
const ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
const DEFAULTS_MODE_OPTIONS = ["in-region", "cross-region", "mobile", "standard", "legacy"];
const IMDS_REGION_PATH = "/latest/meta-data/placement/region";

const AWS_DEFAULTS_MODE_ENV = "AWS_DEFAULTS_MODE";
const AWS_DEFAULTS_MODE_CONFIG = "defaults_mode";
const NODE_DEFAULTS_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => {
        return env[AWS_DEFAULTS_MODE_ENV];
    },
    configFileSelector: (profile) => {
        return profile[AWS_DEFAULTS_MODE_CONFIG];
    },
    default: "legacy",
};

const resolveDefaultsModeConfig = ({ region = nodeConfigProvider.loadConfig(configResolver.NODE_REGION_CONFIG_OPTIONS), defaultsMode = nodeConfigProvider.loadConfig(NODE_DEFAULTS_MODE_CONFIG_OPTIONS), } = {}) => propertyProvider.memoize(async () => {
    const mode = typeof defaultsMode === "function" ? await defaultsMode() : defaultsMode;
    switch (mode?.toLowerCase()) {
        case "auto":
            return resolveNodeDefaultsModeAuto(region);
        case "in-region":
        case "cross-region":
        case "mobile":
        case "standard":
        case "legacy":
            return Promise.resolve(mode?.toLocaleLowerCase());
        case undefined:
            return Promise.resolve("legacy");
        default:
            throw new Error(`Invalid parameter for "defaultsMode", expect ${DEFAULTS_MODE_OPTIONS.join(", ")}, got ${mode}`);
    }
});
const resolveNodeDefaultsModeAuto = async (clientRegion) => {
    if (clientRegion) {
        const resolvedRegion = typeof clientRegion === "function" ? await clientRegion() : clientRegion;
        const inferredRegion = await inferPhysicalRegion();
        if (!inferredRegion) {
            return "standard";
        }
        if (resolvedRegion === inferredRegion) {
            return "in-region";
        }
        else {
            return "cross-region";
        }
    }
    return "standard";
};
const inferPhysicalRegion = async () => {
    if (process.env[AWS_EXECUTION_ENV] && (process.env[AWS_REGION_ENV] || process.env[AWS_DEFAULT_REGION_ENV])) {
        return process.env[AWS_REGION_ENV] ?? process.env[AWS_DEFAULT_REGION_ENV];
    }
    if (!process.env[ENV_IMDS_DISABLED]) {
        try {
            const { getInstanceMetadataEndpoint, httpRequest } = await __webpack_require__.e(/* import() */ 885).then(__webpack_require__.t.bind(__webpack_require__, 1885, 19));
            const endpoint = await getInstanceMetadataEndpoint();
            return (await httpRequest({ ...endpoint, path: IMDS_REGION_PATH })).toString();
        }
        catch (e) {
        }
    }
};

exports.resolveDefaultsModeConfig = resolveDefaultsModeConfig;


/***/ })

};

//# sourceMappingURL=468.index.js.map