const pg = require("./dbKnex");
class DBTable {
    constructor(tablename, table = function(table){
        table.bigInteger("id").unsigned().primary();
    }) {
        this._name = tablename;
        this._table = table;
        this._generatedID = false;
        this.create();
    }

    async create(check = true) {
        if(check && await pg.schema.hasTable(this._name)) return;
        await pg.schema.createTable(this._name, this._table);
    }

    async remake() {
        if(await pg.schema.hasTable(this._name))
            await pg.schema.dropTable(this._name);
        await this.create(false);
        return true;
    }

    async del(id) {
        let res = await pg(this._name).where(typeof id === "object" ? id : {id}).del();
        
        if(res)
            return true;
        else return false;
    }

    async find(name, value) {
        let obj = {};
        obj[name] = value;
        let res = await pg.from(this._name).select().where(obj);
        return res.length && res[0] ? true : false;
    }

    async get(id, data, returnArray = false) {
        let res = await pg.from(this._name).select(data).where(typeof id === "object" ? id : {id});
        if(res.length && res[0])
            return {id: id, success: true, data: returnArray ? res : res[0]};
        else return {id: id, success: false};
    }

    async getAll(data = null) {
        let res = await pg.from(this._name).select(data);
        if(res.length && res[0])
            return {success: true, data: res};
        else return {success: false};
    }

    async upsert(id, data = {}) {
        let res;
        if(id !== null) res = await pg.from(this._name).select(!this._generatedID && typeof id === "object" ? Object.keys(id) : ["id"]).where(typeof id === "object" ? id : {id});

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const element = data[key];
                if(typeof element === "object")
                data[key] = JSON.stringify(element);
            }
        }

        if(res && res.length && res[0]) {
            res = await pg(this._name).where(!this._generatedID ? typeof id === "object" ? id : {id} : {id: res[0].id}).update(data, typeof id === "object" ? Object.keys(id) : ["id"]);
        } else {
            res = await pg(this._name).returning(!this._generatedID && typeof id === "object" ? Object.keys(id) : ["id"]).insert(id ? typeof id === "object" ? {...id, ...data} : {id, ...data} : data);
        }

        if(Array.isArray(res) && res.length)
            return {success: true, data: res[0]};
        else return {success: false};
    }

    async insert(data, returning = ["id"]) {
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const element = data[key];
                if(typeof element === "object")
                data[key] = JSON.stringify(element);
            }
        }

        let res = await pg(this._name).returning(returning).insert(data);
        
        if(Array.isArray(res) && res.length)
            return {success: true, data: res};
        else return {success: false};
    }
}

class LinkingTable extends DBTable {
    constructor(name, referenceXName, referenceXLink, referenceYName, referenceYLink) {
        super(name, table => {
            table.integer(referenceXName).unsigned().references(referenceXLink).notNullable();
            table.integer(referenceYName).unsigned().references(referenceYLink).notNullable();
        });
    }
}

module.exports = {Table:DBTable,LinkingTable};