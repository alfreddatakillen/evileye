class EvilEyeError extends Error {};
class NoConfiguration extends EvilEyeError {};

module.exports = {
    EvilEyeError,
    NoConfiguration
};