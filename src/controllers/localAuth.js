const {Authentication, Configuration} = require("./authentication");

class LocalAuthentication extends Authentication {
    constructor() {
        const method = (req, res, config, auth) => {

        };

        const serialize = (id, data, config, auth) => {

        }

        const deserialize = (id, config, auth) => {

        } 

        super(method, serialize, deserialize);
    }

    register(config = {
        redirectSuccess: null,
        redirectFailure: null
    }) {
        return async (req, res, next) => {
            const _config = new Configuration(config);
            if(req.session.id) {
                
            }
        }
    }
}