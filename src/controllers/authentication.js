const CryptoJS = require("crypto-js");
const flash = require("smol-flash");
const { validationResult } = require('express-validator');

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
            ...data
        }, res, req, next);
        this.required = data.required || data.required === undefined ? true : false;
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
            const id = req.session.user_id;
            if(id) {
                if(this._logout) {
                    let lres = await this._logout(req, res, _config, this);
                    if(lres instanceof Error) {
                        _config.error(lres);
                        return;
                    }
                } else delete req.session.user_id;
            }

            flash(req, {error: false, description: "Logout successful!"})
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
            const id = req.session.user_id;
            if(id || !_config.required) {
                if(id) {
                    req.user = await this.deserialize(id, _config, this);
                    if(req.user instanceof Error) {
                        _config.error(req.user);
                        return;
                    }
                } else req.user.id = null;
                _config.success();
            } else {
                req.user.id = null;
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

            const errors = validationResult(req);
            if(!errors.isEmpty() && errors.errors[0]) {
                _config.error(new Error(errors.errors[0].msg));
                return;
            }
            
            const id = req.session.user_id;
            if(id) {
                _config.success();
                return;
            }

            const mres = await this.method(req, res, _config, this);
            if(mres instanceof Error)
                _config.error(mres);
            else if(mres) {
                req.session.user_id = mres.id;
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
        return {salt, key: key.toString(CryptoJS.enc.Hex)};
    }

    static checkHash(salt, hash, str) {
        let key = CryptoJS.PBKDF2(str, salt, {
            keySize: 256 / 32
        });
        return key.toString(CryptoJS.enc.Hex) === hash;
    }
}

module.exports = {
    Configuration,
    CheckConfig,
    Authentication
};