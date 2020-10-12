const { insert } = require("./dbKnex");
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

    async del(id, field = null) {
        let res = await Array.isArray(id) ? pg(this._name).whereIn(field ? field : "id", id).del() : pg(this._name).where(field ? field : typeof id === "object" ? id : {id}, field ? typeof id === "object" ? id : {id} : undefined).del();
        
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
        let clean = (dirtyData) => {
            for (const key in data) {
                if (dirtyData.hasOwnProperty(key)) {
                    const element = dirtyData[key];
                    if(typeof element === "object")
                    dirtyData[key] = JSON.stringify(element);
                }
            }
            return dirtyData;
        }

        data = Array.isArray(data) ? data.map(v => clean(v)) : clean(data);        

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
        this.refX = {name: referenceXName, link: referenceXLink, table: referenceXLink.split(".").shift()};
        this.refY = {name: referenceYName, link: referenceYLink, table: referenceYLink.split(".").shift()};
    }

    insert(data) {
        return super.insert(data, [this.refX.name, this.refY.name]);
    }

    async link(idX, idY, join = true) {
        let arr = Array.isArray(idX) ? {array: {...this.refX, data: idX}, ref: {...this.idY, data: idY}} : Array.isArray(idY) ? {array: {...this.refY, data: idY}, ref: {...this.refX, data: idX}} : null;
        if(arr) {
            let jRes = await this.getLinked(arr.array.table, arr.ref.data);
            if(jRes.success) {
                if(!join) {
                    let rem = jRes.data.map(v => {
                        return {
                            id: v,
                            notPresent: !arr.array.data.includes(v)
                        }
                    }).filter(v => v.notPresent).map(v => v.id);
                    let works = await pg(this._name).whereIn(arr.array.name, rem).andWhere(function() {this.where(arr.ref.name, arr.ref.data)}).del();
                }

                let add = arr.array.data.map(v => {
                    return {
                        id: v,
                        notPresent: jRes.data.includes(v)
                    }
                }).filter(v => v.notPresent).map(v => {
                    let addObj = {};
                    addObj[arr.ref.name] = arr.id;
                    addObj[arr.array.name] = v;
                    return addObj;
                });

                const insert = await this.insert(add);
                return insert;
            } else {
                const insert = await this.insert(arr.array.data.map(v => {
                    let addObj = {};
                    addObj[arr.ref.name] = arr.ref.data;
                    addObj[arr.array.name] = v;
                    return addObj;
                }));
                return insert;
            }
        } else {
            let obj = {};
            obj[this.refX.name] = idX;
            obj[this.refY.name] = idY;
            return await this.insert(obj);
        }
    }

    async getLinked(table, id) {
        let obj = {}, filter = "";
        if(table === this.refX.table)
            {obj[this.refY.name] = id; filter = this.refX.name;}
        else if(table === this.refY.table) 
            {obj[this.refX.name] = id; filter = this.refY.name;}
        else throw Error(table + " is not linked here");
        const res = await this.get(obj, [filter], true);
        if(res.success) {
            return {id, success: true, data: res.data.map(v => v[filter])}
        } else return {id, success: false};
    }

    async removeLinked(idX, idY) {
        let obj = {};
        obj[this.refX.name] = idX;
        obj[this.refY.name] = idY;
        return await this.del(obj);
    }
}

module.exports = {Table:DBTable,LinkingTable};