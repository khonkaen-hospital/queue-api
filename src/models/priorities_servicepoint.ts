import * as knex from 'knex';

export class PrioritiesServicepointModel {

    tableName = 'q4u_priorities_servicepoint';

    list(db: knex) {
        return db(this.tableName);
    }

    listByServicePoint(db: knex, service_point_id) {
        return db(this.tableName).where('service_point_id', service_point_id);
    }

    find(db: knex, id) {
        return db(this.tableName).where('id', id).first();
    }

    save(db: knex, data: any) {
        return db(this.tableName).insert(data);
    }

    update(db: knex, id: any, data: any) {
        return db(this.tableName).where('id', id).update(data);
    }

    remove(db: knex, id: any) {
        return db(this.tableName).where('id', id).del();
    }

}