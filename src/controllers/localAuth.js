const {Authentication, Configuration} = require("./authentication");
const {Users} = require("./dbMain");
const { validationResult } = require('express-validator');

class LocalAuthentication extends Authentication {
    constructor() {
        const method = async (req, res, config, auth) => {
            const body = req.body;
            const getQuery = await Users.get({username: body.username});

            if(!getQuery.success) {
                return new Error("Username doesn't exist");
            }

            const isPass = Authentication.checkHash(getQuery.data.salt, getQuery.data.password, body.password);
            if(isPass) 
                return {id: getQuery.data.id, data: getQuery.data};
            else return new Error("Password incorrect");
        };

        const serialize = (id, data, config, auth) => {
            return;
        }

        const deserialize = async (id, config, auth) => {
            const query = await Users.get(id);
            if(!query.success) {
                config.error(new Error("Failed to retrieve user data"));
                return;
            }
            return query.data;
        } 

        super(method, serialize, deserialize);
    }

    register(config = {
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

            if(req.session.user_id) {
                _config.success();
                return;
            }

            const body = req.body;
            const ucheck = await Users.find("username", body.username);
            const echeck = await Users.find("email", body.email);

            if(ucheck || echeck) {
                _config.error(ucheck ? new Error("Username already taken") : new Error("Email already registered"));
                return;
            }

            const password = body.password;
            if(!(password.search(/[a-z]/g)+1) || !(password.search(/[A-Z]/g)+1) || !(password.search(/[0-9]/g)+1) || !(password.search(/[^\d\w]/g)+1)) {
                _config.error(new Error("Password must contain at least one lowercase letter, one uppercase letter, one number and one symbol"));
                return;
            }

            const pass_hash = Authentication.hash(body.password);

            const query = await Users.upsert(null, {username: body.username, email: body.email, password: pass_hash.key, salt: pass_hash.salt});
            if(query.success) {
                req.session.user_id = query.data.id;
                req.user = query.data;
                this.serialize(req.user.id, req.user);
                _config.success();
            } else _config.error(new Error("Query failed"));
        }
    }
}

const Local = new LocalAuthentication();
module.exports = Local;