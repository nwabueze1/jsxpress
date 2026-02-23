const OP_MAP = {
    "=": "$eq",
    "!=": "$ne",
    ">": "$gt",
    ">=": "$gte",
    "<": "$lt",
    "<=": "$lte",
    "in": "$in",
    "not in": "$nin",
};
function toMongoColumn(column) {
    return column === "id" ? "_id" : column;
}
function buildFilter(where) {
    const filter = {};
    for (const w of where) {
        const col = toMongoColumn(w.column);
        const op = w.op.toLowerCase();
        if (op === "is null") {
            filter[col] = null;
        }
        else if (op === "is not null") {
            filter[col] = { $ne: null };
        }
        else if (w.op === "=") {
            filter[col] = w.value;
        }
        else {
            const mongoOp = OP_MAP[w.op];
            if (!mongoOp) {
                throw new Error(`Unsupported operator for MongoDB: ${w.op}`);
            }
            filter[col] = { [mongoOp]: w.value };
        }
    }
    return filter;
}
function docToRow(doc) {
    if (!doc)
        return doc;
    const { _id, ...rest } = doc;
    return { id: _id, ...rest };
}
export class MongodbAdapter {
    dialect = "mongodb";
    client = null;
    db = null;
    url;
    constructor(url) {
        this.url = url;
    }
    async connect() {
        const mod = await import(/* @vite-ignore */ "mongodb");
        const MongoClient = mod.MongoClient ?? mod.default?.MongoClient;
        this.client = new MongoClient(this.url);
        await this.client.connect();
        this.db = this.client.db();
    }
    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }
    async find(table, where, options = {}) {
        const collection = this.db.collection(table);
        const filter = buildFilter(where);
        let cursor = collection.find(filter);
        if (options.columns?.length) {
            const projection = {};
            for (const col of options.columns) {
                projection[toMongoColumn(col)] = 1;
            }
            cursor = cursor.project(projection);
        }
        if (options.sort?.length) {
            const sort = {};
            for (const s of options.sort) {
                sort[toMongoColumn(s.column)] = s.direction === "asc" ? 1 : -1;
            }
            cursor = cursor.sort(sort);
        }
        if (options.offset !== undefined) {
            cursor = cursor.skip(options.offset);
        }
        if (options.limit !== undefined) {
            cursor = cursor.limit(options.limit);
        }
        const docs = await cursor.toArray();
        return docs.map(docToRow);
    }
    async count(table, where) {
        const collection = this.db.collection(table);
        const filter = buildFilter(where);
        return collection.countDocuments(filter);
    }
    async insertOne(table, data) {
        const collection = this.db.collection(table);
        const result = await collection.insertOne(data);
        return { id: result.insertedId, ...data };
    }
    async updateMany(table, where, data) {
        const collection = this.db.collection(table);
        const filter = buildFilter(where);
        const result = await collection.updateMany(filter, { $set: data });
        return result.modifiedCount;
    }
    async deleteMany(table, where) {
        const collection = this.db.collection(table);
        const filter = buildFilter(where);
        const result = await collection.deleteMany(filter);
        return result.deletedCount;
    }
    async createCollection(table, _schema) {
        const collections = await this.db
            .listCollections({ name: table })
            .toArray();
        if (collections.length === 0) {
            await this.db.createCollection(table);
        }
    }
    async raw(_sql, _params) {
        throw new Error("raw() is not supported for MongoDB. Use the operation methods instead.");
    }
}
//# sourceMappingURL=mongodb.js.map