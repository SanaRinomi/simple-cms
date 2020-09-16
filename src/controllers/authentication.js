const CryptoJS = require("crypto-js");
const flash = require("smol-flash");

class Configuration {
    constructor(data = {
        redirectSuccess: null,
        redirectFailure: null
    }, res, req, next) {
        this.data = {
            redirectSuccess: null,
            redirectFailure: null,
            ...data
        }
        this.res = res;
        this.req = req;
        this.next = next;
    }

    success() {
        this.data.redirectSuccess ? this.res.redirect(this.data.redirectSuccess) : this.next();
    }

    error(err) {
        this.res.id = null;
        flash(this.req, {error: true, description: err.message});
        this.data.redirectFailure ? this.res.redirect(this.data.redirectFailure) : this.next(err);
    }
}

class CheckConfig extends Configuration {
    constructor(data = {
        redirectSuccess: null,
        redirectFailure: null,
        required: true
    }, res, req, next) {
        super({
            redirectSuccess: null,
            redirectFailure: null,
            required: true,
            ...data
        }, res, req, next);
    }
}

class Authentication {
    constructor(method, serialize, deserialize, logout) {
        this.serialize = serialize;
        this.deserialize = deserialize;
        this.method = method;
        this._logout = logout;
    }

    logOut(config = {
        redirectSuccess: null,
        redirectFailure: null
    }) {
        return async (req, res, next) => {
            const _config = new Configuration(config, res, req, next);
            const id = req.session.id;
            if(id) {
                if(this._logout) {
                    let lres = await this._logout(req, res, _config, this);
                    if(lres instanceof Error) {
                        _config.error(lres);
                        return;
                    }
                } else req.session.id = null;
            }
            _config.success();
        }
    }

    isLoggedIn(config = {
        redirectSuccess: null,
        redirectFailure: null,
        required: true
    }) {
        return async (req, res, next) => {
            const _config = new CheckConfig(config, res, req, next);
            const id = req.session.id;
            if(id || _config.required) {
                if(id) {
                    res.id = id;
                    res.data = await this.deserialize(id, _config, this);
                    if(res.data instanceof Error) {
                        _config.error(res.data);
                        return;
                    }
                } else res.id = null;
                _config.success();
            } else {
                res.id = null;
                _config.error(Error("Not authorized"));
            }
        }
    }

    authenticate(config = {
        redirectSuccess: null,
        redirectFailure: null
    }) {
        return async (req, res, next) => {
            const _config = new Configuration(config, res, req, next);
            const id = req.session.id;
            if(id) {
                _config.success();
                return;
            }

            const mres = this.method(req, res, _config, this);
            if(mres instanceof Error)
                _config.error(mres);
            else if(mres) {
                req.session.id = mres.id;
                this.serialize(mres.id, mres.data, _config, this);
                _config.success();
            } else _config.success();
        }
    }

    error(req, res, err, config) {
        res.id = null;
        flash(req, {error: true, description: err.message});
        config.redirectFailure ? res.redirect(config.redirectFailure) : next(err)
    }

    static hash(str) {
        let salt = CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
        let key = CryptoJS.PBKDF2(str, salt, {
            keySize: 256 / 32
        });
        return {salt, key};
    }

    static checkHash(salt, hash, str) {
        let key = CryptoJS.PBKDF2(str, salt, {
            keySize: 256 / 32
        });
        return key === hash;
    }
}

module.exports = {
    Configuration,
    CheckConfig,
    Authentication
};