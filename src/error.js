class AllAuthFnsFailed extends Error {};
class AuthFnIsNotAFunction extends Error {};
class EvilEyeError extends Error {};
class NoAuthFnRegistered extends Error {};
class NoConfiguration extends EvilEyeError {};

module.exports = {
    AllAuthFnsFailed,
    AuthFnIsNotAFunction,
    EvilEyeError,
    NoAuthFnRegistered,
    NoConfiguration
};